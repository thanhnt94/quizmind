import pandas as pd
from typing import List, Dict, Any, Tuple
from io import BytesIO

class ExcelQuizService:
    @staticmethod
    def parse_quiz_excel(file_content: bytes) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Parses an Excel file matching MindStack's structure with 'Info' and 'Data' sheets.
        Returns (metadata, questions)
        """
        try:
            print(f"DEBUG: Loading Excel file into pandas...")
            excel_file = pd.ExcelFile(BytesIO(file_content))
            print(f"DEBUG: Sheet names found: {excel_file.sheet_names}")
        except Exception as e:
            print(f"CRITICAL: Excel loading error: {e}")
            return {}, []

        # 1. Parse 'Info' sheet for metadata
        metadata = {
            "title": "Imported Quiz",
            "description": "",
            "category": "General",
            "time_limit": 0
        }
        
        if "Info" in excel_file.sheet_names:
            print("DEBUG: Parsing 'Info' sheet...")
            df_info = excel_file.parse("Info")
            # Normalize Info sheet columns
            df_info.columns = [str(c).strip().lower() for c in df_info.columns]
            
            if "key" in df_info.columns and "value" in df_info.columns:
                for _, row in df_info.iterrows():
                    key = str(row.get("key", "")).strip().lower()
                    value = str(row.get("value", "")).strip()
                    if not value or value.lower() == "nan": continue
                    
                    if key == "title": metadata["title"] = value
                    elif key == "description": metadata["description"] = value
                    elif key == "category": metadata["category"] = value
                    elif key == "tags": metadata["tags"] = [t.strip() for t in value.split(",") if t.strip()]
                    elif key == "time_limit": 
                        try: metadata["time_limit"] = int(float(value))
                        except: pass
        
        print(f"DEBUG: Metadata extracted: {metadata['title']}")

        # 2. Parse 'Data' sheet for questions
        questions = []
        if not excel_file.sheet_names:
            return metadata, []
            
        sheet_name = "Data" if "Data" in excel_file.sheet_names else excel_file.sheet_names[0]
        print(f"DEBUG: Parsing '{sheet_name}' sheet for questions...")
        df_data = excel_file.parse(sheet_name)
        
        # Normalize data columns
        df_data.columns = [str(c).strip().lower() for c in df_data.columns]
        print(f"DEBUG: Found {len(df_data)} rows in data sheet.")
        
        for idx, row in df_data.iterrows():
            def get_val(col, default=""):
                try:
                    val = row.get(col)
                    return str(val).strip() if pd.notna(val) else default
                except:
                    return default

            question_text = get_val("question")
            if not question_text or question_text.lower() == "nan":
                continue

            # Core fields mapping
            known_cols = ["question", "option_a", "option_b", "option_c", "option_d", "answer", "correct_answer", "correct_answer_text", "question_image_file", "question_audio_file", "guidance", "explanation"]
            
            # Find AI column (any column with 'ai' in it that's not already known)
            ai_col = next((c for c in df_data.columns if "ai" in c and c not in known_cols), None)
            
            # Find the answer column (it could be named 'answer', 'correct_answer', 'correct_answer_text', etc.)
            ans_col = next((c for c in ["answer", "correct_answer", "correct_answer_text", "correct"] if c in df_data.columns), "answer")

            # Get ID if present
            id_val = get_val("id") or get_val("item_id") or get_val("id câu hỏi") or get_val("id item")
            q_id = None
            if id_val and id_val.lower() != "nan":
                try:
                    q_id = int(float(id_val))
                except:
                    pass

            # Get question type
            q_type = get_val("type") or get_val("question_type") or "normal"
            q_type = q_type.lower().strip()
            if q_type == "nan": q_type = "normal"

            question_data = {
                "id": q_id,
                "content": question_text,
                "explanation": get_val("guidance") or get_val("explanation"),
                "ai_explanation": get_val(ai_col) if ai_col else "",
                "question_type": q_type,
                "image": get_val("image") or get_val("question_image_file"),
                "audio": get_val("audio") or get_val("question_audio_file"),
                "options": [],
                "others": {}
            }
            
            # Collect others
            for col in df_data.columns:
                if col not in known_cols and col != ai_col:
                    val = get_val(col)
                    if val and val.lower() != "nan":
                        question_data["others"][col] = val

            # Robust Answer Mapping
            raw_answer = get_val(ans_col).strip()
            # For index-based answers (A, B, C, D), we lowercase it. 
            # For text-based answers, we keep it as is (or case-insensitive comparison later).
            clean_raw_answer = raw_answer.lower().rstrip('.').rstrip(')').strip()
            
            answer_map = {
                "a": "option_a", "b": "option_b", "c": "option_c", "d": "option_d",
                "1": "option_a", "2": "option_b", "3": "option_c", "4": "option_d"
            }
            target_opt_key_by_index = answer_map.get(clean_raw_answer)

            for opt_key in ["option_a", "option_b", "option_c", "option_d"]:
                opt_content = get_val(opt_key)
                if opt_content and opt_content.lower() != "nan":
                    # Check match by index OR by full text content
                    clean_opt_content = opt_content.lower().strip()
                    is_correct = (clean_opt_content == clean_raw_answer or opt_key == target_opt_key_by_index)
                    
                    question_data["options"].append({
                        "content": opt_content,
                        "is_correct": is_correct
                    })
            
            if question_data["options"]:
                questions.append(question_data)
                
        return metadata, questions

    @staticmethod
    def export_quiz_to_excel(quiz_title: str, quiz_description: str, category_name: str, tags: List[str], questions: List[Any]) -> bytes:
        """
        Generates an Excel workbook (bytes) containing Info and Data sheets
        for exporting a QuizMind quiz.
        """
        from io import BytesIO
        output = BytesIO()
        
        # 1. Prepare Info sheet key-value data
        info_data = [
            {"key": "title", "value": quiz_title},
            {"key": "description", "value": quiz_description or ""},
            {"key": "category", "value": category_name or "General"},
            {"key": "tags", "value": ", ".join(tags) if tags else ""}
        ]
        df_info = pd.DataFrame(info_data)
        
        # 2. Prepare Data sheet rows
        # Discover all custom keys present in any question's others dict
        custom_cols = set()
        for q in questions:
            if q.others and isinstance(q.others, dict):
                for k in q.others.keys():
                    if k not in ("id", "item_id", "order_in_container", "question", "option_a", "option_b", "option_c", "option_d", "answer", "correct_answer", "correct_answer_text", "question_image_file", "question_audio_file", "guidance", "explanation", "image", "audio"):
                        custom_cols.add(k)
                        
        custom_cols = sorted(list(custom_cols))
        
        rows = []
        for q in questions:
            # Extract options
            opt_a = q.options[0].content if len(q.options) > 0 else ""
            opt_b = q.options[1].content if len(q.options) > 1 else ""
            opt_c = q.options[2].content if len(q.options) > 2 else ""
            opt_d = q.options[3].content if len(q.options) > 3 else ""
            
            # The correct answer text:
            correct_opt = next((o.content for o in q.options if o.is_correct), "")
            
            row = {
                "id": q.id,
                "question": q.content,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "answer": correct_opt,
                "explanation": q.explanation or "",
                "ai_explanation": q.ai_explanation or "",
                "image": q.image or "",
                "audio": q.audio or "",
                "type": q.question_type or "normal"
            }
            
            # Add custom columns
            if q.others and isinstance(q.others, dict):
                for col in custom_cols:
                    row[col] = q.others.get(col, "")
            else:
                for col in custom_cols:
                    row[col] = ""
            rows.append(row)
            
        df_data = pd.DataFrame(rows)
        
        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_info.to_excel(writer, sheet_name="Info", index=False)
            df_data.to_excel(writer, sheet_name="Data", index=False)
            
        return output.getvalue()
