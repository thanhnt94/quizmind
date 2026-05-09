import pandas as pd
import os

def create_template():
    # 1. Info Sheet
    info_data = {
        "Key": ["Title", "Description", "Category", "Tags", "Time_Limit"],
        "Value": ["My Neural Quiz", "This is a sample quiz imported from Excel.", "General", "JLPT, N1, Grammar", "60"]
    }
    df_info = pd.DataFrame(info_data)

    # 2. Data Sheet
    data_data = {
        "Question": ["Hệ mặt trời có bao nhiêu hành tinh?", "Ai là người phát triển thuyết tương đối?"],
        "Option_A": ["7", "Isaac Newton"],
        "Option_B": ["8", "Albert Einstein"],
        "Option_C": ["9", "Nikola Tesla"],
        "Option_D": ["10", "Galileo Galilei"],
        "Answer": ["B", "B"],
        "Explanation": ["Sao Diêm Vương không còn được coi là hành tinh từ năm 2006.", "Albert Einstein công bố thuyết tương đối hẹp vào năm 1905."],
        "AI Analysis": ["Phân tích chuyên sâu về hệ mặt trời...", "Phân tích về vật lý hiện đại..."]
    }
    df_data = pd.DataFrame(data_data)

    # Save to static directory
    static_dir = r"c:\Code\Ecosystem\QuizMind\app\static"
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
        
    template_path = os.path.join(static_dir, "QuizMind_Template.xlsx")
    
    with pd.ExcelWriter(template_path, engine='openpyxl') as writer:
        df_info.to_excel(writer, sheet_name='Info', index=False)
        df_data.to_excel(writer, sheet_name='Data', index=False)
    
    print(f"Template created at {template_path}")

if __name__ == "__main__":
    create_template()
