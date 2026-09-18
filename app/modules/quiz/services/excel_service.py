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

        groups_dict = {}
        group_counters = {}
        
        for idx, row in df_data.iterrows():
            def get_val(col, default=""):
                try:
                    val = row.get(col)
                    return str(val).strip() if pd.notna(val) else default
                except:
                    return default

            def find_col_val(candidates, default=""):
                for cand in candidates:
                    v = get_val(cand)
                    if v and v.lower() != "nan":
                        return v
                return default

            question_text = get_val("question")
            if not question_text or question_text.lower() == "nan":
                continue

            # Core fields mapping
            known_cols = [
                "question", "option_a", "option_b", "option_c", "option_d", 
                "answer", "correct_answer", "correct_answer_text", 
                "image", "question_image_file", "image_url", "image_file", "ảnh", "hình ảnh", "link ảnh",
                "audio", "question_audio_file", "audio_url", "audio_file", "âm thanh", "file nghe", "link audio",
                "guidance", "explanation",
                "group_id", "group_code", "group", "nhóm câu hỏi", "nhóm", "mã nhóm", "passage_id",
                "group_title", "tiêu đề nhóm", "tên nhóm", "group_name",
                "passage", "passage_content", "passage_text", "bài đọc", "ngữ cảnh", "context", "đoạn văn",
                "group_audio", "audio nhóm", "audio_chung", "group_audio_file", "group_audio_url",
                "group_image", "ảnh nhóm", "image_chung", "group_image_file", "group_image_url",
                "group_order", "sub_order", "thứ tự trong nhóm", "thứ tự", "câu số trong nhóm",
                "allow_shuffle", "shuffle", "xáo trộn", "cho phép xáo trộn", "shuffle_options"
            ]
            
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

            # ── Group parsing ──
            raw_group_code = find_col_val(["group_id", "group_code", "group", "nhóm câu hỏi", "nhóm", "mã nhóm", "passage_id"])
            group_code = raw_group_code.strip() if raw_group_code and raw_group_code.lower() != "nan" else None

            # ── Shuffle parsing (Default True unless explicitly disabled) ──
            raw_shuffle = find_col_val(["allow_shuffle", "shuffle", "xáo trộn", "cho phép xáo trộn", "shuffle_options"])
            allow_shuffle = True
            if raw_shuffle and raw_shuffle.lower() in ("no", "false", "0", "k", "khong", "không", "off", "disable", "disabled"):
                allow_shuffle = False

            order_in_group = 0
            from app.modules.quiz.services.media_resolver import unresolve_central_url

            if group_code:
                # Order within group
                raw_order = find_col_val(["group_order", "sub_order", "thứ tự trong nhóm", "thứ tự", "câu số trong nhóm"])
                if group_code not in groups_dict:
                    group_counters[group_code] = 0
                    g_title = find_col_val(["group_title", "tiêu đề nhóm", "tên nhóm", "group_name"])
                    g_passage = find_col_val(["passage", "passage_content", "passage_text", "bài đọc", "ngữ cảnh", "context", "đoạn văn"])
                    g_audio = unresolve_central_url(find_col_val(["group_audio", "audio nhóm", "audio_chung", "group_audio_file", "group_audio_url"]))
                    g_image = unresolve_central_url(find_col_val(["group_image", "ảnh nhóm", "image_chung", "group_image_file", "group_image_url"]))

                    groups_dict[group_code] = {
                        "group_code": group_code,
                        "title": g_title or f"Questions ({group_code})",
                        "passage_text": g_passage or "",
                        "audio_url": g_audio or "",
                        "image_url": g_image or "",
                        "allow_shuffle": allow_shuffle
                    }
                else:
                    # Update group info if current row has passage/audio and group doesn't
                    g_passage = find_col_val(["passage", "passage_content", "passage_text", "bài đọc", "ngữ cảnh", "context", "đoạn văn"])
                    g_audio = unresolve_central_url(find_col_val(["group_audio", "audio nhóm", "audio_chung", "group_audio_file", "group_audio_url"]))
                    g_image = unresolve_central_url(find_col_val(["group_image", "ảnh nhóm", "image_chung", "group_image_file", "group_image_url"]))
                    if g_passage and not groups_dict[group_code]["passage_text"]:
                        groups_dict[group_code]["passage_text"] = g_passage
                    if g_audio and not groups_dict[group_code]["audio_url"]:
                        groups_dict[group_code]["audio_url"] = g_audio
                    if g_image and not groups_dict[group_code]["image_url"]:
                        groups_dict[group_code]["image_url"] = g_image

                group_counters[group_code] += 1
                if raw_order and raw_order.lower() != "nan":
                    try:
                        order_in_group = int(float(raw_order))
                    except:
                        order_in_group = group_counters[group_code]
                else:
                    order_in_group = group_counters[group_code]

            raw_q_img = find_col_val(["image", "question_image_file", "image_url", "image_file", "ảnh", "hình ảnh", "link ảnh"])
            raw_q_audio = find_col_val(["audio", "question_audio_file", "audio_url", "audio_file", "âm thanh", "file nghe", "link audio"])

            question_data = {
                "id": q_id,
                "content": question_text,
                "explanation": get_val("guidance") or get_val("explanation"),
                "ai_explanation": get_val(ai_col) if ai_col else "",
                "question_type": q_type,
                "image": unresolve_central_url(raw_q_img) if raw_q_img else "",
                "audio": unresolve_central_url(raw_q_audio) if raw_q_audio else "",
                "group_code": group_code,
                "order_in_group": order_in_group,
                "allow_shuffle": allow_shuffle,
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
                "1": "option_a", "2": "option_b", "3": "option_c", "4": "option_d",
                "option_a": "option_a", "option_b": "option_b", "option_c": "option_c", "option_d": "option_d"
            }
            target_opt_key_by_index = answer_map.get(clean_raw_answer)

            for opt_key in ["option_a", "option_b", "option_c", "option_d"]:
                opt_content = get_val(opt_key)
                if opt_content and opt_content.lower() != "nan":
                    clean_opt_content = opt_content.lower().strip()
                    if target_opt_key_by_index:
                        is_correct = (opt_key == target_opt_key_by_index)
                    else:
                        is_correct = (clean_opt_content == clean_raw_answer)
                    
                    question_data["options"].append({
                        "content": opt_content,
                        "is_correct": is_correct
                    })
            
            if question_data["options"]:
                questions.append(question_data)

        # Attach parsed groups into metadata
        metadata["groups"] = list(groups_dict.values())
                
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
            others = q.get("others") if isinstance(q, dict) else getattr(q, "others", None)
            if others and isinstance(others, dict):
                for k in others.keys():
                    if k not in ("id", "item_id", "order_in_container", "question", "option_a", "option_b", "option_c", "option_d", "answer", "correct_answer", "correct_answer_text", "question_image_file", "question_audio_file", "guidance", "explanation", "image", "audio"):
                        custom_cols.add(k)
                        
        custom_cols = sorted(list(custom_cols))
        
        rows = []
        for q in questions:
            is_dict = isinstance(q, dict)
            if is_dict:
                q_id = q.get("id")
                q_content = q.get("content", "")
                q_explanation = q.get("explanation", "")
                q_ai_explanation = q.get("ai_explanation", "")
                q_image = q.get("image", "")
                q_audio = q.get("audio", "")
                q_type = q.get("question_type", "normal")
                q_allow_shuffle = q.get("allow_shuffle", True)
                q_order = q.get("order_in_group", "")
                group_id = q.get("group_code", "")
                group_title = q.get("group_title", "")
                passage = q.get("passage_text", "")
                group_audio = q.get("group_audio", "")
                group_image = q.get("group_image", "")
                others = q.get("others") or {}
                
                raw_opts = q.get("options", [])
                opt_a = raw_opts[0].get("content", "") if len(raw_opts) > 0 else ""
                opt_b = raw_opts[1].get("content", "") if len(raw_opts) > 1 else ""
                opt_c = raw_opts[2].get("content", "") if len(raw_opts) > 2 else ""
                opt_d = raw_opts[3].get("content", "") if len(raw_opts) > 3 else ""
                correct_opt = next((o.get("content", "") for o in raw_opts if o.get("is_correct")), "")
            else:
                q_id = q.id
                q_content = q.content
                q_explanation = q.explanation or ""
                q_ai_explanation = q.ai_explanation or ""
                q_image = q.image or ""
                q_audio = q.audio or ""
                q_type = q.question_type or "normal"
                q_allow_shuffle = getattr(q, "allow_shuffle", True)
                q_order = getattr(q, "order_in_group", "") or ""
                others = q.others if isinstance(q.others, dict) else {}
                
                options_list = q.__dict__.get("options")
                if options_list is None and hasattr(q, "options"):
                    try: options_list = q.options
                    except Exception: options_list = []
                options_list = options_list or []

                opt_a = options_list[0].content if len(options_list) > 0 else ""
                opt_b = options_list[1].content if len(options_list) > 1 else ""
                opt_c = options_list[2].content if len(options_list) > 2 else ""
                opt_d = options_list[3].content if len(options_list) > 3 else ""
                correct_opt = next((o.content for o in options_list if getattr(o, "is_correct", False)), "")
                
                group_obj = q.__dict__.get("group")
                if group_obj is None and hasattr(q, "group"):
                    try: group_obj = q.group
                    except Exception: group_obj = None

                group_id = getattr(group_obj, "group_code", "") if group_obj else ""
                group_title = getattr(group_obj, "title", "") if group_obj else ""
                passage = getattr(group_obj, "passage_text", "") if group_obj else ""
                group_audio = getattr(group_obj, "audio_url", "") if group_obj else ""
                group_image = getattr(group_obj, "image_url", "") if group_obj else ""

            row = {
                "id": q_id,
                "group_id": group_id,
                "group_title": group_title,
                "passage": passage,
                "group_audio": group_audio,
                "group_image": group_image,
                "group_order": q_order,
                "allow_shuffle": "NO" if q_allow_shuffle is False else "YES",
                "question": q_content,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "answer": correct_opt,
                "explanation": q_explanation,
                "ai_explanation": q_ai_explanation,
                "image": q_image,
                "audio": q_audio,
                "type": q_type
            }
            
            # Add custom columns
            if others and isinstance(others, dict):
                for col in custom_cols:
                    row[col] = others.get(col, "")
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
