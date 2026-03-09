"""
RAG Evaluation dùng RAGAs.

Chạy: python -m eval.ragas_eval

Metrics:
- faithfulness:      câu trả lời có trung thực với context không?
- answer_relevancy:  câu trả lời có liên quan đến câu hỏi không?
- context_recall:    context có đủ thông tin để trả lời không?
- context_precision: context có chứa nhiều thông tin không liên quan không?
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
)

from app.rag.pipeline import answer
from app.utils.logger import logger

TEST_QUESTIONS_FILE = Path(__file__).parent / "test_questions.json"


async def _run_pipeline(questions: list[dict]) -> list[dict]:
    """Chạy RAG pipeline cho từng câu hỏi trong test set."""
    results = []
    for item in questions:
        logger.info(f"Evaluating: {item['question'][:60]}")
        response = await answer(item["question"])
        results.append({
            "question": item["question"],
            "answer": response.answer,
            "contexts": [s.excerpt for s in response.sources],
            "ground_truth": item.get("ground_truth", ""),
        })
    return results


def run_eval():
    # Load test questions
    if not TEST_QUESTIONS_FILE.exists():
        logger.error(f"Không tìm thấy {TEST_QUESTIONS_FILE}")
        return

    with open(TEST_QUESTIONS_FILE, encoding="utf-8") as f:
        questions = json.load(f)

    logger.info(f"Evaluating {len(questions)} questions...")

    # Chạy pipeline
    results = asyncio.run(_run_pipeline(questions))

    # Build dataset cho RAGAs
    dataset = Dataset.from_list(results)

    # Evaluate
    score = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_recall, context_precision],
    )

    logger.info("=== RAGAs Evaluation Results ===")
    print(score)

    # Lưu kết quả
    output_path = Path(__file__).parent / "results" / "latest.json"
    output_path.parent.mkdir(exist_ok=True)
    score.to_pandas().to_json(output_path, orient="records", force_ascii=False, indent=2)
    logger.info(f"Results saved to {output_path}")


if __name__ == "__main__":
    run_eval()
