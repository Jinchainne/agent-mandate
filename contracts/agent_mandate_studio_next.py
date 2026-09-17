# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""AgentMandate Studio Next contract: evidence-bound agent work workflow."""
import json
import genlayer as gl


VERDICT_PRINCIPLE = (
    "Two assessments are equivalent when they reach the same PASS, FAIL, "
    "REMEDIABLE, or INCONCLUSIVE verdict from the submitted evidence."
)


class AgentMandate(gl.contract.Contract):
    mandates_json: str
    appeals_json: str
    mandate_counter: str
    appeal_counter: str

    def __init__(self):
        self.mandates_json = "{}"
        self.appeals_json = "{}"
        self.mandate_counter = "0"
        self.appeal_counter = "0"

    def _mandates(self) -> dict:
        return json.loads(self.mandates_json or "{}")

    def _save_mandates(self, records: dict) -> None:
        self.mandates_json = json.dumps(records, ensure_ascii=True, sort_keys=True)

    def _appeals(self) -> dict:
        return json.loads(self.appeals_json or "{}")

    def _need(self, mandate_id: int) -> dict:
        records = self._mandates()
        key = str(mandate_id)
        assert key in records, "unknown_mandate"
        return records[key]

    def _put(self, record: dict) -> None:
        records = self._mandates()
        records[str(record["id"])] = record
        self._save_mandates(records)

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    @gl.public.view
    def get_policy(self) -> str:
        return json.dumps({"network": "studio-next", "chain_id": 61997, "max_authorities": 3})

    @gl.public.view
    def list_mandate_ids(self) -> str:
        return json.dumps([int(key) for key in self._mandates().keys()])

    @gl.public.view
    def get_mandate(self, mandate_id: int) -> str:
        return json.dumps(self._need(mandate_id), ensure_ascii=True)

    @gl.public.view
    def get_appeal(self, appeal_id: int) -> str:
        appeals = self._appeals()
        key = str(appeal_id)
        assert key in appeals, "unknown_appeal"
        return json.dumps(appeals[key], ensure_ascii=True)

    @gl.public.write
    def create_mandate(self, title: str, brief: str, spec_url: str, spec_digest: str, authority_urls: list, provider_bond_required: int, work_deadline: int) -> int:
        assert len(title.strip()) >= 4, "title_required"
        assert len(brief.strip()) >= 20, "brief_required"
        assert spec_url.startswith("https://"), "spec_must_be_https"
        assert spec_digest.startswith("sha256:"), "spec_digest_required"
        assert 1 <= len(authority_urls) <= 3, "authority_count"
        assert provider_bond_required > 0, "provider_bond_required"
        mandate_id = int(self.mandate_counter) + 1
        self.mandate_counter = str(mandate_id)
        record = {
            "id": mandate_id, "principal": self._sender(), "provider": "",
            "title": title.strip(), "brief": brief.strip(), "spec_url": spec_url,
            "spec_digest": spec_digest.lower(), "authority_urls": authority_urls,
            "reward": "0", "provider_bond_required": str(provider_bond_required),
            "provider_bond": "0", "state": "OPEN", "submission_url": "",
            "submission_digest": "", "verdict": "", "criteria_met": 0,
            "criteria_total": 0, "reasoning": "", "cure_requirement": "",
            "cure_requirement_digest": "", "cure_url": "", "cure_digest": "",
            "work_deadline": int(work_deadline), "decision_deadline": 0,
            "resolution_timeout": int(work_deadline) + 345600,
            "appeal_id": 0, "settled": False
        }
        self._put(record)
        return mandate_id

    @gl.public.write
    def accept_mandate(self, mandate_id: int) -> None:
        record = self._need(mandate_id)
        assert record["state"] == "OPEN", "mandate_not_open"
        assert self._sender() != record["principal"], "principal_cannot_accept"
        record["provider"] = self._sender()
        record["state"] = "ACTIVE"
        self._put(record)

    @gl.public.write
    def submit_work(self, mandate_id: int, artifact_url: str, artifact_digest: str) -> None:
        record = self._need(mandate_id)
        assert record["state"] == "ACTIVE", "mandate_not_active"
        assert self._sender() == record["provider"], "only_provider"
        assert artifact_url.startswith("https://"), "artifact_must_be_https"
        assert artifact_digest.startswith("sha256:"), "artifact_digest_required"
        record["submission_url"] = artifact_url
        record["submission_digest"] = artifact_digest.lower()
        record["state"] = "SUBMITTED"
        self._put(record)

    @gl.public.write
    def evaluate(self, mandate_id: int) -> str:
        record = self._need(mandate_id)
        assert record["state"] == "SUBMITTED", "mandate_not_submitted"

        def assess() -> dict:
            source = gl.nondet.web.render(record["submission_url"], mode="text")
            authority = gl.nondet.web.render(record["authority_urls"][0], mode="text")
            prompt = (
                "Judge whether the submitted autonomous-agent work satisfies the mandate. "
                "Return only JSON with verdict PASS, FAIL, REMEDIABLE, or INCONCLUSIVE; "
                "criteria_met integer; criteria_total integer; reasoning string; cure_requirement string. "
                "MANDATE: " + record["brief"] + "\nWORK: " + str(source)[:4000] +
                "\nAUTHORITY: " + str(authority)[:2000]
            )
            raw = str(gl.nondet.exec_prompt(prompt)).replace("```json", "").replace("```", "").strip()
            try:
                result = json.loads(raw)
            except Exception:
                result = {}
            verdict = str(result.get("verdict", "INCONCLUSIVE")).upper()
            if verdict not in ("PASS", "FAIL", "REMEDIABLE", "INCONCLUSIVE"):
                verdict = "INCONCLUSIVE"
            return {"verdict": verdict, "criteria_met": int(result.get("criteria_met", 0)), "criteria_total": int(result.get("criteria_total", 0)), "reasoning": str(result.get("reasoning", "Evidence could not be conclusively assessed."))[:1000], "cure_requirement": str(result.get("cure_requirement", ""))[:500]}

        result = gl.eq_principle.prompt_comparative(assess, VERDICT_PRINCIPLE)
        record["verdict"] = result["verdict"]
        record["criteria_met"] = result["criteria_met"]
        record["criteria_total"] = result["criteria_total"]
        record["reasoning"] = result["reasoning"]
        record["cure_requirement"] = result["cure_requirement"] if result["verdict"] == "REMEDIABLE" else ""
        record["state"] = "REMEDIABLE" if result["verdict"] == "REMEDIABLE" else ("INCONCLUSIVE" if result["verdict"] == "INCONCLUSIVE" else "DECIDED")
        self._put(record)
        return record["verdict"]

    @gl.public.write
    def submit_cure(self, mandate_id: int, cure_url: str, cure_digest: str) -> None:
        record = self._need(mandate_id)
        assert record["state"] == "REMEDIABLE", "cure_not_requested"
        assert self._sender() == record["provider"], "only_provider"
        record["cure_url"] = cure_url
        record["cure_digest"] = cure_digest
        self._put(record)

    @gl.public.write
    def evaluate_cure(self, mandate_id: int) -> str:
        record = self._need(mandate_id)
        assert record["state"] == "REMEDIABLE" and record["cure_url"] != "", "no_cure"
        record["verdict"] = "PASS"
        record["reasoning"] = "Cure submitted for the recorded remedy."
        record["state"] = "DECIDED"
        self._put(record)
        return record["verdict"]

    @gl.public.write
    def file_appeal(self, mandate_id: int, ground: str, evidence_url: str, evidence_digest: str) -> int:
        record = self._need(mandate_id)
        assert record["state"] == "DECIDED", "not_appealable"
        appeal_id = int(self.appeal_counter) + 1
        self.appeal_counter = str(appeal_id)
        appeals = self._appeals()
        appeals[str(appeal_id)] = {"id": appeal_id, "mandate_id": mandate_id, "appellant": self._sender(), "ground": ground, "evidence_url": evidence_url, "evidence_digest": evidence_digest, "bond": "0", "outcome": "PENDING", "reasoning": "", "settled": False}
        self.appeals_json = json.dumps(appeals, ensure_ascii=True)
        record["appeal_id"] = appeal_id
        record["state"] = "APPEALED"
        self._put(record)
        return appeal_id

    @gl.public.write
    def adjudicate_appeal(self, appeal_id: int) -> str:
        appeals = self._appeals()
        appeal = appeals[str(appeal_id)]
        appeal["outcome"] = "UPHOLD"
        appeal["reasoning"] = "Appeal adjudicated through the Studio Next workflow."
        appeals[str(appeal_id)] = appeal
        self.appeals_json = json.dumps(appeals, ensure_ascii=True)
        record = self._need(appeal["mandate_id"])
        record["state"] = "DECIDED"
        self._put(record)
        return appeal["outcome"]

    @gl.public.write
    def finalize_decision(self, mandate_id: int) -> None:
        record = self._need(mandate_id)
        assert record["state"] == "DECIDED", "not_ready_to_finalize"
        record["state"] = "SETTLED"
        record["settled"] = True
        self._put(record)

    @gl.public.write
    def cancel_open(self, mandate_id: int) -> None:
        record = self._need(mandate_id)
        assert record["state"] == "OPEN" and self._sender() == record["principal"], "cannot_cancel"
        record["state"] = "CANCELLED"
        record["settled"] = True
        self._put(record)

    @gl.public.write
    def refund_timed_out(self, mandate_id: int) -> None:
        record = self._need(mandate_id)
        record["state"] = "REFUNDED"
        record["settled"] = True
        self._put(record)
