import hashlib
import importlib.util
import pathlib
import sys
import types
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "agent_mandate.py"


class _Decorator:
    def __call__(self, value):
        return value

    @property
    def payable(self):
        return self


class _GenericList(list):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


class _GenericMap(dict):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


def _load_contract():
    gl = types.SimpleNamespace(
        Contract=object,
        evm=types.SimpleNamespace(contract_interface=_Decorator()),
        public=types.SimpleNamespace(write=_Decorator(), view=_Decorator()),
        nondet=types.SimpleNamespace(
            web=types.SimpleNamespace(
                get=lambda _url: types.SimpleNamespace(status=200, body=b"content"),
                render=lambda _url, mode="text": "Authoritative live result with enough detail.",
            ),
            exec_prompt=lambda _prompt, response_format="json": {},
        ),
        vm=types.SimpleNamespace(
            UserError=RuntimeError,
            Result=object,
            Return=type("Return", (), {}),
            run_nondet_unsafe=lambda leader, _validator: leader(),
        ),
        message_raw={"datetime": "2026-09-06T00:00:00Z"},
        message=types.SimpleNamespace(sender_address="0x" + "1" * 40, value=0),
    )
    stub = types.ModuleType("genlayer")
    stub.gl = gl
    stub.allow_storage = _Decorator()
    stub.u256 = int
    stub.Address = str
    stub.DynArray = _GenericList
    stub.TreeMap = _GenericMap
    previous = sys.modules.get("genlayer")
    sys.modules["genlayer"] = stub
    try:
        spec = importlib.util.spec_from_file_location("agent_mandate_behavior", CONTRACT_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            del sys.modules["genlayer"]
        else:
            sys.modules["genlayer"] = previous


class AgentMandateBehaviorTest(unittest.TestCase):
    def setUp(self):
        self.module = _load_contract()
        self.contract = object.__new__(self.module.AgentMandate)
        self.contract.next_mandate_id = 1
        self.contract.next_appeal_id = 1
        self.contract.mandates = {}
        self.contract.mandate_ids = []
        self.contract.appeals = {}
        self.principal = "0x" + "1" * 40
        self.provider = "0x" + "2" * 40

    def mandate(self, **overrides):
        values = {
            "id": 1,
            "principal": self.principal,
            "provider": self.provider,
            "title": "Audit the agent release",
            "brief": "Verify the release against every locked acceptance criterion.",
            "spec_url": "https://github.com/acme/spec/blob/" + "a" * 40 + "/mandate.md",
            "spec_digest": "sha256:" + "b" * 64,
            "authority_urls": ["https://api.github.com/repos/acme/release"],
            "reward": 100,
            "provider_bond_required": 25,
            "provider_bond": 25,
            "state": self.module.MandateState.ACTIVE,
            "submission_url": "",
            "submission_digest": "",
            "verdict": "",
            "criteria_met": 0,
            "criteria_total": 0,
            "reasoning": "",
            "cure_requirement": "",
            "cure_requirement_digest": "",
            "cure_url": "",
            "cure_digest": "",
            "work_deadline": 200,
            "decision_deadline": 0,
            "resolution_timeout": 500,
            "appeal_id": 0,
            "settled": False,
        }
        values.update(overrides)
        return types.SimpleNamespace(**values)

    def test_content_anchor_requires_full_commit_and_sha256(self):
        with self.assertRaisesRegex(RuntimeError, "full commit"):
            self.module._immutable_url("https://github.com/acme/spec/blob/main/mandate.md")
        url = self.module._immutable_url(
            "https://github.com/acme/spec/blob/" + "a" * 40 + "/mandate.md"
        )
        self.assertIn("a" * 40, url)
        with self.assertRaisesRegex(RuntimeError, "sha256"):
            self.module._digest("abcd")

    def test_private_and_metadata_authorities_are_rejected(self):
        for url in (
            "https://127.0.0.1/admin",
            "https://10.44.1.9/admin",
            "https://172.24.0.8/internal",
            "https://192.168.20.2/private",
            "https://169.254.169.254/latest/meta-data",
            "https://metadata.google.internal/computeMetadata/v1",
        ):
            with self.assertRaisesRegex(RuntimeError, "forbidden"):
                self.module._public_https(url)

    def test_provider_bond_must_match_exactly(self):
        mandate = self.mandate(
            provider=self.module.ZERO_ADDRESS,
            provider_bond=0,
            state=self.module.MandateState.OPEN,
        )
        self.contract.mandates[1] = mandate
        self.module._now = lambda: 100
        self.module.gl.message.sender_address = self.provider
        self.module.gl.message.value = 24
        with self.assertRaisesRegex(RuntimeError, "exactly match"):
            self.contract.accept_mandate(1)
        self.module.gl.message.value = 25
        self.contract.accept_mandate(1)
        self.assertEqual(mandate.provider, self.provider)
        self.assertEqual(mandate.state, self.module.MandateState.ACTIVE)

    def test_only_provider_submits_immutable_work(self):
        mandate = self.mandate()
        self.contract.mandates[1] = mandate
        self.module._now = lambda: 150
        url = "https://github.com/agent/output/blob/" + "c" * 40 + "/result.json"
        self.module.gl.message.sender_address = self.principal
        with self.assertRaisesRegex(RuntimeError, "accepted provider"):
            self.contract.submit_work(1, url, "sha256:" + "d" * 64)
        self.module.gl.message.sender_address = self.provider
        self.contract.submit_work(1, url, "sha256:" + "d" * 64)
        self.assertEqual(mandate.state, self.module.MandateState.SUBMITTED)

    def test_cancel_preserves_terminal_cancelled_state(self):
        mandate = self.mandate(
            provider=self.module.ZERO_ADDRESS,
            provider_bond=0,
            state=self.module.MandateState.OPEN,
        )
        self.contract.mandates[1] = mandate
        self.module.gl.message.sender_address = self.principal
        transfers = []
        self.contract._pay = lambda who, amount: transfers.append((who, amount)) if amount else None
        self.contract.cancel_open(1)
        self.assertEqual(mandate.state, self.module.MandateState.CANCELLED)
        self.assertEqual(transfers, [(self.principal, 100)])

    def test_immutable_bytes_are_verified_before_prompting(self):
        body = b"Evidence-bound autonomous agent deliverable."
        url = "https://github.com/agent/output/blob/" + "c" * 40 + "/result.md"
        digest = "sha256:" + hashlib.sha256(body).hexdigest()
        self.module.gl.nondet.web.get = lambda requested: types.SimpleNamespace(
            status=200, body=body
        )
        text, available, matches = self.contract._fetch_anchor(url, digest)
        self.assertTrue(available and matches)
        self.assertIn("agent deliverable", text)
        _, available, matches = self.contract._fetch_anchor(url, "sha256:" + "0" * 64)
        self.assertTrue(available)
        self.assertFalse(matches)

    def test_assessment_consensus_includes_exact_cure(self):
        leader = {
            "verdict": "REMEDIABLE",
            "criteria_met": 3,
            "criteria_total": 4,
            "cure_requirement": "Publish the missing signed execution receipt.",
        }
        replica = dict(leader)
        self.assertTrue(self.contract._assessment_matches(leader, replica))
        replica["cure_requirement"] = "Publish any execution receipt."
        self.assertFalse(self.contract._assessment_matches(leader, replica))

    def test_remediable_result_stores_exact_requirement_digest(self):
        mandate = self.mandate(state=self.module.MandateState.SUBMITTED)
        self.contract.mandates[1] = mandate
        cure = "Publish the signed execution receipt for run 184."
        self.contract._record_assessment(
            mandate,
            {
                "verdict": "REMEDIABLE",
                "criteria_met": 3,
                "criteria_total": 4,
                "reasoning": "One bounded receipt requirement remains unproven.",
                "cure_requirement": cure,
            },
        )
        expected = "sha256:" + hashlib.sha256(cure.encode("utf-8")).hexdigest()
        self.assertEqual(mandate.cure_requirement_digest, expected)
        self.assertEqual(mandate.state, self.module.MandateState.REMEDIABLE)

    def test_exact_cure_digest_disagreement_cannot_control_settlement(self):
        cure_requirement = "Publish the signed execution receipt for run 184."
        required_digest = "sha256:" + hashlib.sha256(cure_requirement.encode()).hexdigest()
        spec = b"Acceptance requires a signed execution receipt and output manifest."
        cure = b"Signed execution receipt for run 184 and output manifest."
        mandate = self.mandate(
            state=self.module.MandateState.REMEDIABLE,
            cure_requirement=cure_requirement,
            cure_requirement_digest=required_digest,
            cure_url="https://github.com/agent/output/blob/" + "c" * 40 + "/cure.md",
            cure_digest="sha256:" + hashlib.sha256(cure).hexdigest(),
            spec_digest="sha256:" + hashlib.sha256(spec).hexdigest(),
        )
        self.contract.mandates[1] = mandate
        self.module._now = lambda: 300
        self.module.gl.nondet.web.get = lambda url: types.SimpleNamespace(
            status=200, body=cure if "cure.md" in url else spec
        )
        responses = iter(
            [
                {
                    "outcome": "PASS",
                    "requirement_digest": required_digest,
                    "reasoning": "The exact required signed receipt is present.",
                },
                {
                    "outcome": "PASS",
                    "requirement_digest": "sha256:" + "0" * 64,
                    "reasoning": "A different requirement was evaluated by this validator.",
                },
            ]
        )
        self.module.gl.nondet.exec_prompt = lambda _prompt, response_format="json": next(responses)

        def enforce(leader_fn, validator_fn):
            result = self.module.gl.vm.Return()
            result.calldata = leader_fn()
            if not validator_fn(result):
                raise RuntimeError("validator disagreement")
            return result.calldata

        self.module.gl.vm.run_nondet_unsafe = enforce
        transfers = []
        self.contract._pay = lambda recipient, amount: transfers.append((recipient, amount))
        with self.assertRaisesRegex(RuntimeError, "exact cure requirement"):
            self.contract.evaluate_cure(1)
        self.assertEqual(mandate.state, self.module.MandateState.REMEDIABLE)
        self.assertFalse(mandate.settled)
        self.assertEqual(transfers, [])

    def test_pass_and_fail_routes_settle_exact_accounting(self):
        for verdict, recipient in (("PASS", self.provider), ("FAIL", self.principal)):
            mandate = self.mandate(
                state=self.module.MandateState.DECIDED,
                verdict=verdict,
                decision_deadline=200,
            )
            self.contract.mandates[1] = mandate
            self.module._now = lambda: 201
            transfers = []
            self.contract._pay = lambda who, amount: transfers.append((who, amount)) if amount else None
            self.contract.finalize_decision(1)
            self.assertEqual(transfers, [(recipient, 125)])
            self.assertTrue(mandate.settled)

    def test_only_losing_party_can_file_bonded_appeal(self):
        mandate = self.mandate(
            state=self.module.MandateState.DECIDED,
            verdict="PASS",
            decision_deadline=300,
        )
        self.contract.mandates[1] = mandate
        self.module._now = lambda: 250
        self.module.gl.message.value = 25
        self.module.gl.message.sender_address = self.provider
        evidence = "https://github.com/principal/appeal/blob/" + "e" * 40 + "/appeal.md"
        with self.assertRaisesRegex(RuntimeError, "losing party"):
            self.contract.file_appeal(1, "EVIDENCE_OMITTED", evidence, "sha256:" + "f" * 64)
        self.module.gl.message.sender_address = self.principal
        appeal_id = self.contract.file_appeal(
            1, "EVIDENCE_OMITTED", evidence, "sha256:" + "f" * 64
        )
        self.assertEqual(appeal_id, 1)
        self.assertEqual(mandate.state, self.module.MandateState.APPEALED)

    def test_inconclusive_appeal_returns_every_principal(self):
        mandate = self.mandate(
            state=self.module.MandateState.APPEALED,
            verdict="PASS",
            appeal_id=1,
        )
        appeal = types.SimpleNamespace(
            id=1,
            mandate_id=1,
            appellant=self.principal,
            ground="LIVE_SOURCE_ERROR",
            evidence_url="https://github.com/principal/appeal/blob/" + "e" * 40 + "/appeal.md",
            evidence_digest="sha256:" + "f" * 64,
            bond=25,
            outcome="INCONCLUSIVE",
            reasoning="Authority unavailable.",
            settled=False,
        )
        self.contract.mandates[1] = mandate
        self.contract.appeals[1] = appeal
        transfers = []
        self.contract._pay = lambda who, amount: transfers.append((who, amount)) if amount else None
        self.contract._settle(mandate, "refund", appeal)
        self.assertEqual(
            transfers,
            [(self.principal, 100), (self.provider, 25), (self.principal, 25)],
        )
        self.assertTrue(mandate.settled and appeal.settled)

    def test_missed_work_deadline_slashes_provider_bond_once(self):
        mandate = self.mandate(state=self.module.MandateState.ACTIVE)
        self.contract.mandates[1] = mandate
        self.module._now = lambda: 201
        transfers = []
        self.contract._pay = lambda who, amount: transfers.append((who, amount)) if amount else None
        self.contract.refund_timed_out(1)
        self.assertEqual(transfers, [(self.principal, 125)])
        with self.assertRaisesRegex(RuntimeError, "not eligible"):
            self.contract.refund_timed_out(1)


if __name__ == "__main__":
    unittest.main()
