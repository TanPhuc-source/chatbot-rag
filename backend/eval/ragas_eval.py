"""
eval/ragas_eval.py
Chạy đánh giá RAG pipeline bằng RAGAS framework.
"""

import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Import RAGAS & Langchain ──────────────────────────────────────────────────
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision
)
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

# Khai báo biến METRICS
METRICS = [faithfulness, answer_relevancy, context_recall, context_precision]

from datasets import Dataset

# ── Import pipeline nội bộ ───────────────────────────────────────────────────
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # thêm thư mục backend vào path

from app.rag.pipeline import answer, RAGResponse
from app.config import get_settings

settings = get_settings()

# ── Load test questions ───────────────────────────────────────────────────────
TEST_FILE = Path(__file__).parent / "test_questions.json"

def load_test_questions():
    with open(TEST_FILE, encoding="utf-8") as f:
        return json.load(f)

# ── Chạy pipeline để lấy câu trả lời và context ──────────────────────────────
async def run_pipeline_on_questions(questions: list[dict]) -> list[dict]:
    results = []

    for i, item in enumerate(questions):
        q = item["question"]
        print(f"\n[{i+1}/{len(questions)}] {q[:60]}...")

        while True:
            try:
                response: RAGResponse = await answer(
                    question=q,
                    history=[],
                )
                results.append({
                    "question":    q,
                    "answer":      response.answer,
                    "contexts":    [s.excerpt for s in response.sources],
                    "ground_truth": item["ground_truth"],
                })
                
                # Tạm nghỉ 15 giây sau mỗi câu hỏi để tránh Rate Limit của Groq
                print("   ⏳ Đang đợi 15s để tránh Rate Limit...")
                await asyncio.sleep(15) 
                break # Thoát vòng lặp while nếu lấy được câu trả lời thành công

            except Exception as e:
                # Bắt riêng lỗi 429 và thử lại sau 60s
                if "429" in str(e) or "rate_limit" in str(e).lower():
                    print(f"  ⚠ Quá tải Groq API. Tạm nghỉ 60s rồi thử lại tự động...")
                    await asyncio.sleep(60)
                else:
                    print(f"  ⚠ Lỗi không xác định: {e}")
                    results.append({
                        "question":    q,
                        "answer":      "",
                        "contexts":    [],
                        "ground_truth": item["ground_truth"],
                    })
                    break

    return results

# ── Đánh giá bằng RAGAS ──────────────────────────────────────────────────────
def evaluate_with_ragas(results: list[dict]) -> dict:
    dataset = Dataset.from_list(results)
    
    # Khởi tạo LLM và Embeddings cho Ragas làm Giám khảo
    # Dùng model llama3-8b-8192 nhẹ hơn để làm giám khảo, tránh ngốn token
    eval_llm = ChatGroq(model_name="llama3-8b-8192")
    ragas_llm = LangchainLLMWrapper(eval_llm)
    
    # Khởi tạo embedding cho Ragas
    eval_embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    ragas_embeddings = LangchainEmbeddingsWrapper(eval_embeddings)

    print("   🧠 Bắt đầu quá trình Ragas chấm điểm...")
    score = evaluate(
        dataset, 
        metrics=METRICS,
        llm=ragas_llm,
        embeddings=ragas_embeddings
    )
    return score

# ── In kết quả đẹp ───────────────────────────────────────────────────────────
def print_results(score: dict, results: list[dict]):
    print("\n" + "="*60)
    print("  KẾT QUẢ ĐÁNH GIÁ RAG PIPELINE")
    print("="*60)

    # Cập nhật key name chính xác theo chuẩn Ragas mới
    metrics = {
        "Faithfulness      (độ trung thực)": score.get("faithfulness", 0),
        "Answer Relevancy  (độ liên quan TA)": score.get("answer_relevancy", 0),
        "Context Recall    (độ bao phủ CT)": score.get("context_recall", 0),
        "Context Precision (độ chính xác CT)": score.get("context_precision", 0),
    }

    for name, value in metrics.items():
        # Đảm bảo value không bị None do một số metric thỉnh thoảng lỗi không tính được
        safe_value = value if value is not None else 0.0
        bar = "█" * int(safe_value * 20) + "░" * (20 - int(safe_value * 20))
        status = "✅" if safe_value >= 0.7 else ("⚠️ " if safe_value >= 0.5 else "❌")
        print(f"  {status} {name}: {safe_value:.3f}  [{bar}]")

    # Lọc ra các giá trị không phải None để tính trung bình
    valid_scores = [v for v in metrics.values() if v is not None]
    avg = sum(valid_scores) / len(valid_scores) if valid_scores else 0
    print(f"\n  📊 Điểm trung bình: {avg:.3f}")

    if avg >= 0.8:
        print("  🎉 Excellent — Production ready!")
    elif avg >= 0.6:
        print("  👍 Good — Chấp nhận được, có thể cải thiện thêm")
    else:
        print("  🔧 Cần cải thiện pipeline")

    output = {
        "scores": {k: float(v) if v is not None else 0.0 for k, v in metrics.items()},
        "average": float(avg),
        "details": results,
    }
    out_path = Path(__file__).parent / "eval_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n  📄 Kết quả chi tiết lưu tại: {out_path}")

# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    print("🔍 Loading test questions...")
    questions = load_test_questions()
    print(f"   Tổng số câu hỏi: {len(questions)}")

    print("\n🤖 Chạy RAG pipeline...")
    results = await run_pipeline_on_questions(questions)

    print("\n📐 Đánh giá với RAGAS...")
    score = evaluate_with_ragas(results)

    print_results(score, results)

if __name__ == "__main__":
    asyncio.run(main())