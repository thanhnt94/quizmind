# QuizMind Data Structure Guide

This document outlines the standard structure for Quiz collections and individual Quiz Questions in the QuizMind ecosystem. Use this as a reference for creating Excel templates or integrating via API.

## 1. Collection Metadata (Info Sheet)

The metadata defines the overall identity and behavior of the quiz question set. In an Excel template, these are key-value pairs in the **'Info'** sheet.

| Key | Description | Example |
|:---|:---|:---|
| **Title** | The display name of the collection. | JLPT N1 Vocabulary Master |
| **Description** | A brief overview of what this collection covers. | Comprehensive list of N1 Kanji and vocabulary. |
| **Category** | The logical grouping (e.g., Languages, Science). | Japanese |
| **Tags** | Comma-separated keywords for discovery. | jlpt, n1, vocabulary, japanese |
| **Time Limit** | Time allowed for the quiz in minutes (0 = no limit). | 15 |
| **AI Prompt** | System instructions for the AI when analyzing this quiz. | Act as a strict Japanese sensei... |

---

## 2. Quiz Question Structure (Data Sheet)

Individual quiz questions/items are defined in the **'Data'** (or first) sheet. Each row represents one question.

### Core Fields
| Column Header | Description | Required |
|:---|:---|:---|
| **Question** | The main content or prompt of the card. | Yes |
| **Option_A** | Multiple choice option A. | Yes |
| **Option_B** | Multiple choice option B. | Yes |
| **Option_C** | Multiple choice option C. | No |
| **Option_D** | Multiple choice option D. | No |
| **Answer** | The correct option (e.g., "A", "option_a", or the full text). | Yes |
| **Explanation** | Detailed logic or "Neural Guidance" for the answer. | No |

### Rich Media & AI
| Column Header | Description | Format |
|:---|:---|:---|
| **Image** | URL or filename of the associated image. | https://... or image.jpg |
| **Audio** | URL or filename of the associated audio clip. | https://... or audio.mp3 |
| **AI_Explanation**| Specific pre-generated AI explanation for this card. | (Text) |
| **Type** | The question type (e.g., "normal", "multiple_choice"). | Default: "normal" |

### Extended Metadata (Others)
Any additional columns found in the Excel sheet that are not listed above will be automatically ingested into the **'others'** JSON field of the question. This allows for future-proofing and custom data storage (e.g., "Source", "Difficulty Level", "Page Number").

---

## 3. Answer Mapping Logic

QuizMind uses a robust fuzzy-matching algorithm for answers:
1. **By Index**: "A", "B", "C", "D" or "1", "2", "3", "4".
2. **By Key**: "option_a", "option_b", etc.
3. **By Text**: If the Answer column exactly matches the text of one of the options.

---

## 4. API Representation (JSON)

When communicating with the backend, a Quiz is represented as:

```json
{
  "title": "N1 Vocab",
  "description": "...",
  "ai_prompt": "...",
  "questions": [
    {
      "content": "What does '忖度' mean?",
      "image": "https://...",
      "audio": null,
      "explanation": "To surmise someone's feelings.",
      "options": [
        { "content": "To surmise", "is_correct": true },
        { "content": "To ignore", "is_correct": false }
      ]
    }
  ]
}
```
