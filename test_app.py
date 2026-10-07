import io
import time
import requests
import pymupdf

BASE_URL = "http://127.0.0.1:3000/api"

def create_sample_engineering_pdf():
    """Generates a realistic multi-page engineering PDF using PyMuPDF"""
    doc = pymupdf.open()
    
    # Page 1: Control Systems and Feedback
    page1 = doc.new_page()
    text_p1 = (
        "LECTURE 1: INTRODUCTION TO FEEDBACK CONTROL SYSTEMS\n\n"
        "In electrical and mechanical engineering, a closed-loop control system utilizes feedback to compare "
        "the actual output with the desired reference input. The transfer function G(s) represents the ratio "
        "of the Laplace transform of the output Y(s) to the input U(s) under zero initial conditions.\n\n"
        "The canonical closed-loop transfer function is given by T(s) = G(s) / (1 + G(s)H(s)), where H(s) is "
        "the feedback sensor gain. Negative feedback provides stability, reduces sensitivity to parameter variations, "
        "and suppresses external load disturbances.\n\n"
        "Key Assumption: The system is assumed to be linear and time-invariant (LTI) throughout this analysis."
    )
    page1.insert_text((50, 70), text_p1, fontsize=12)

    # Page 2: Thermodynamics and Heat Transfer
    page2 = doc.new_page()
    text_p2 = (
        "LECTURE 2: FIRST AND SECOND LAWS OF THERMODYNAMICS\n\n"
        "The First Law of Thermodynamics states that energy cannot be created or destroyed, only transformed: "
        "delta_U = Q - W, where delta_U is the internal energy change, Q is heat added to the system, and W is work done by the system.\n\n"
        "The Carnot cycle represents an idealized thermodynamic cycle with the maximum theoretical efficiency between two reservoirs: "
        "eta_Carnot = 1 - (T_cold / T_hot), where temperatures are strictly measured in Kelvin.\n\n"
        "Fourier's Law of Thermal Conduction governs heat transfer through a solid medium: "
        "q = -k * (dT / dx), where q is the heat flux, k is thermal conductivity in W/(m*K), and dT/dx is the temperature gradient."
    )
    page2.insert_text((50, 70), text_p2, fontsize=12)

    # Page 3: Fluid Dynamics and Navier-Stokes
    page3 = doc.new_page()
    text_p3 = (
        "LECTURE 3: FLUID STATICS AND INCOMPRESSIBLE FLOW\n\n"
        "Bernoulli's equation describes the conservation of energy along a streamline in steady, incompressible, frictionless flow: "
        "P + 0.5 * rho * v^2 + rho * g * z = constant.\n\n"
        "The Reynolds number (Re) is a dimensionless quantity defining the ratio of inertial forces to viscous forces: "
        "Re = (rho * v * L) / mu. For pipe flow, flow is laminar if Re < 2300 and turbulent if Re > 4000.\n\n"
        "Viscosity mu is measured in Pascal-seconds (Pa*s) and density rho in kg/m^3."
    )
    page3.insert_text((50, 70), text_p3, fontsize=12)

    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def run_all_tests():
    print("=" * 60)
    print("AI-STUDYMATE AUTOMATED TEST SUITE")
    print("=" * 60)

    # 1. Health check
    print("\n[TEST 1] Checking Health Endpoint (/api/health)...")
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["success"] is True
    print("✓ Health check PASSED:", data["data"])

    # 2. PDF Upload & Processing
    print("\n[TEST 2] Testing PDF Upload & RAG Processing (/api/upload)...")
    pdf_bytes = create_sample_engineering_pdf()
    files = {"file": ("engineering_notes.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res = requests.post(f"{BASE_URL}/upload", files=files)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    upload_res = res.json()
    assert upload_res["success"] is True
    doc_info = upload_res["data"]
    doc_id = doc_info["document_id"]
    print(f"✓ Upload PASSED: doc_id={doc_id}, pages={doc_info['pages_count']}, chunks={doc_info['chunks_count']}, status={doc_info['status']}")

    # 3. Document List & Status
    print("\n[TEST 3] Testing Document Retrieval (/api/documents)...")
    res = requests.get(f"{BASE_URL}/documents")
    assert res.status_code == 200
    docs_list = res.json()["data"]
    assert any(d["document_id"] == doc_id for d in docs_list)
    print(f"✓ Document List PASSED: {len(docs_list)} total document(s) indexed.")

    # 4. General Chat (No RAG)
    print("\n[TEST 4] Testing General AI Chat (/api/chat mode=general)...")
    chat_payload = {
        "message": "What is Newton's second law of motion in engineering dynamics?",
        "mode": "general",
        "document_id": None
    }
    res = requests.post(f"{BASE_URL}/chat", json=chat_payload)
    assert res.status_code == 200, f"General chat failed: {res.text}"
    chat_res = res.json()
    assert chat_res["success"] is True
    answer = chat_res["data"]["answer"]
    assert len(answer) > 20
    print(f"✓ General Chat PASSED: Answer length={len(answer)}, sources={len(chat_res['data']['sources'])}")

    # 5. Document RAG Chat (Grounded)
    print("\n[TEST 5] Testing Document RAG Grounded Query (/api/chat mode=document)...")
    rag_payload = {
        "message": "What is Fourier's Law of Thermal Conduction according to the document?",
        "mode": "document",
        "document_id": doc_id
    }
    res = requests.post(f"{BASE_URL}/chat", json=rag_payload)
    assert res.status_code == 200, f"RAG query failed: {res.text}"
    rag_res = res.json()
    assert rag_res["success"] is True
    rag_data = rag_res["data"]
    print(f"✓ RAG Grounded Answer: {rag_data['answer'][:120]}...")
    assert len(rag_data["sources"]) > 0, "Expected at least one source citation"
    citation = rag_data["sources"][0]
    print(f"✓ RAG Citations PASSED: Cited Page {citation['page']}, Score {citation['relevance_score']}, Chunk {citation['chunk_id']}")
    assert citation["page"] == 2, f"Expected citation on Page 2 (Thermodynamics), got Page {citation['page']}"

    # 6. Document RAG with Question Not in Context
    print("\n[TEST 6] Testing Document RAG with Unrelated Question (Grounding Defense)...")
    unrelated_payload = {
        "message": "What is the population of Tokyo in 2024?",
        "mode": "document",
        "document_id": doc_id
    }
    res = requests.post(f"{BASE_URL}/chat", json=unrelated_payload)
    assert res.status_code == 200
    safe_data = res.json()["data"]
    print(f"✓ Safe fallback received: '{safe_data['answer']}'")
    assert "couldn't find enough relevant information" in safe_data["answer"].lower() or len(safe_data["sources"]) == 0

    # 7. MCQ Generation - Document Mode
    print("\n[TEST 7] Testing Document MCQ Generation (/api/mcq mode=document)...")
    mcq_payload = {
        "mode": "document",
        "document_id": doc_id,
        "number_of_questions": 3,
        "difficulty": "medium"
    }
    res = requests.post(f"{BASE_URL}/mcq", json=mcq_payload)
    assert res.status_code == 200, f"MCQ generation failed: {res.text}"
    mcq_res = res.json()
    assert mcq_res["success"] is True
    questions = mcq_res["data"]["questions"]
    assert len(questions) == 3, f"Expected 3 questions, got {len(questions)}"
    for q in questions:
        assert len(q["options"]) == 4, "Each question must have exactly 4 options"
        assert q["correct_answer"] in q["options"], f"Correct answer {q['correct_answer']} not in options {q['options']}"
        assert len(q["explanation"]) > 5, "Explanation cannot be empty"
        print(f"  • Q: {q['question']}")
        print(f"    Options: {q['options']}")
        print(f"    Correct: {q['correct_answer']} | Cited Page: {q['source']['page'] if q.get('source') else 'None'}")
    print("✓ Document MCQ Generation PASSED!")

    # 8. MCQ Generation - General Mode
    print("\n[TEST 8] Testing General MCQ Generation (/api/mcq mode=general)...")
    general_mcq_payload = {
        "mode": "general",
        "number_of_questions": 2,
        "difficulty": "easy"
    }
    res = requests.post(f"{BASE_URL}/mcq", json=general_mcq_payload)
    assert res.status_code == 200
    gen_questions = res.json()["data"]["questions"]
    assert len(gen_questions) == 2
    for q in gen_questions:
        assert len(q["options"]) == 4
        assert q["correct_answer"] in q["options"]
    print("✓ General MCQ Generation PASSED!")

    # 9. Invalid Request Validation
    print("\n[TEST 9] Testing Validation Rejections (/api/chat with empty message)...")
    invalid_chat = {"message": "   ", "mode": "general"}
    res = requests.post(f"{BASE_URL}/chat", json=invalid_chat)
    assert res.status_code in [400, 422], f"Expected 400/422, got {res.status_code}"
    err_json = res.json()
    assert err_json["success"] is False
    assert err_json["error"] is not None
    print("✓ Validation rejection PASSED:", err_json["error"])

    # 10. Non-PDF Upload Rejection
    print("\n[TEST 10] Testing Invalid File Format Rejection (/api/upload with .txt)...")
    fake_file = {"file": ("malicious.txt", io.BytesIO(b"Hello world not a pdf"), "text/plain")}
    res = requests.post(f"{BASE_URL}/upload", files=fake_file)
    assert res.status_code == 400
    assert res.json()["success"] is False
    print("✓ Non-PDF rejection PASSED:", res.json()["error"])

    print("\n" + "=" * 60)
    print("ALL 10 TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
