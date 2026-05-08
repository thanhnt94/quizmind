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
            excel_file = pd.ExcelFile(BytesIO(file_content))
        except Exception as e:
            print(f"Excel loading error: {e}")
            return {}, []

        # 1. Parse 'Info' sheet for metadata
        metadata = {
            "title": "Imported Quiz",
            "description": "",
            "category": "General",
            "time_limit": 0
        }
        
        if "Info" in excel_file.sheet_names:
            df_info = excel_file.parse("Info")
            # Normalize Info sheet columns
            df_info.columns = [str(c).strip().lower() for c in df_info.columns]
            
            if "key" in df_info.columns and "value" in df_info.columns:
                for _, row in df_info.iterrows():
                    key = str(row.get("key", "")).strip().lower()
                    value = str(row.get("value", "")).strip()
                    if key == "title": metadata["title"] = value
                    elif key == "description": metadata["description"] = value
                    elif key == "category": metadata["category"] = value
                    elif key == "time_limit": 
                        try: metadata["time_limit"] = int(float(value))
                        except: pass

        # 2. Parse 'Data' sheet for questions
        questions = []
        if not excel_file.sheet_names:
            return metadata, []
            
        sheet_name = "Data" if "Data" in excel_file.sheet_names else excel_file.sheet_names[0]
        df_data = excel_file.parse(sheet_name)
        
        # Normalize data columns
        df_data.columns = [str(c).strip().lower() for c in df_data.columns]
        
        for _, row in df_data.iterrows():
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
            known_cols = ["question", "option_a", "option_b", "option_c", "option_d", "answer", "question_image_file", "question_audio_file", "guidance", "explanation"]
            
            # Find AI column (any column with 'ai' in it that's not already known)
            ai_col = next((c for c in df_data.columns if "ai" in c and c not in known_cols), None)
            
            # Get question type
            q_type = get_val("type") or get_val("question_type") or "normal"
            q_type = q_type.lower().strip()
            if q_type == "nan": q_type = "normal"

            question_data = {
                "content": question_text,
                "explanation": get_val("guidance") or get_val("explanation"),
                "ai_explanation": get_val(ai_col) if ai_col else "",
                "question_type": q_type,
                "image": get_val("question_image_file"),
                "audio": get_val("question_audio_file"),
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
            raw_answer = get_val("answer").lower().strip()
            # Handle formats like "a.", "a)", "1."
            clean_raw_answer = raw_answer.rstrip('.').rstrip(')').strip()
            
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
