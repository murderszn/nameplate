import unittest
import json
import base64
import time
from scripts.nameplate_qr import (
    mint_npid,
    validate_npid,
    normalize_crockford,
    calculate_crockford_checksum,
    generate_tag_signature,
    verify_tag_signature,
    build_qr_payload,
    PureQR,
    mint_offline_event,
    generate_printable_sheet_svg,
    DEFAULT_ORG_SECRET,
    DEFAULT_ORG_ID,
)

class TestNameplateCryptoQR(unittest.TestCase):

    def test_npid_minting_and_validation(self):
        """Test that generated NPIDs match Crockford Base32 rules and checksums."""
        for _ in range(50):
            npid = mint_npid()
            self.assertTrue(npid.startswith("NP-"))
            self.assertEqual(len(npid), 11)  # NP- + 8 chars
            valid, msg = validate_npid(npid, strict_checksum=True)
            self.assertTrue(valid, f"NPID {npid} failed validation: {msg}")

    def test_normalization_rules(self):
        """Test normalization maps 0/O, 1/I/L and removes dashes."""
        self.assertEqual(normalize_crockford("np-1i1l-00oo"), "NP11110000")
        self.assertEqual(normalize_crockford("NP-7K2M-4QX9"), "NP7K2M4QX9")

    def test_tag_cryptographic_signature(self):
        """Test HMAC-SHA256 signature generation and offline verification."""
        npid = mint_npid()
        sig, ts = generate_tag_signature(
            npid=npid,
            org_id=DEFAULT_ORG_ID,
            batch_id="BATCH-TEST",
            secret_key=DEFAULT_ORG_SECRET
        )
        self.assertTrue(len(sig) >= 12)
        
        # Valid verification
        is_valid = verify_tag_signature(
            npid=npid,
            sig=sig,
            issued_at=ts,
            org_id=DEFAULT_ORG_ID,
            batch_id="BATCH-TEST",
            secret_key=DEFAULT_ORG_SECRET
        )
        self.assertTrue(is_valid)

        # Tampered NPID should fail
        self.assertFalse(verify_tag_signature(
            npid="NP-FORGED00",
            sig=sig,
            issued_at=ts,
            org_id=DEFAULT_ORG_ID,
            batch_id="BATCH-TEST",
            secret_key=DEFAULT_ORG_SECRET
        ))

        # Tampered Org ID should fail
        self.assertFalse(verify_tag_signature(
            npid=npid,
            sig=sig,
            issued_at=ts,
            org_id="org_rogue_adversary",
            batch_id="BATCH-TEST",
            secret_key=DEFAULT_ORG_SECRET
        ))

    def test_build_qr_payload(self):
        """Test building full signed public URL payload."""
        npid = "NP-7K2M4QX9"
        payload = build_qr_payload(npid, org_id="org_sonoran", batch_id="B1")
        self.assertEqual(payload["npid"], "NP-7K2M4QX9")
        self.assertTrue(payload["url"].startswith("https://np.app/a/NP7K2M4QX9?s="))
        self.assertTrue(payload["compact_uri"].startswith("np://t/NP7K2M4QX9/"))

    def test_pure_python_qr_encoder(self):
        """Test pure-python QR code generator matrix and ANSI/SVG output."""
        data = "https://np.app/a/NP7K2M4QX9?s=test"
        qr = PureQR(data, ec_level="H")
        self.assertGreater(qr.size, 20)
        self.assertEqual(len(qr.matrix), qr.size)
        self.assertEqual(len(qr.matrix[0]), qr.size)

        ansi = qr.to_ansi()
        self.assertIn("█", ansi)
        self.assertIn("▀", ansi)

        svg = qr.to_svg()
        self.assertIn("<svg", svg)
        self.assertIn("<rect", svg)

    def test_offline_event_ledger_hash_chain(self):
        """Test hash chaining of offline field events."""
        ev1 = mint_offline_event(
            asset_npid="NP-7K2M4QX9",
            action="TAG_CLAIMED",
            unit_label="Unit 402",
            tech_id="tech_morales"
        )
        self.assertIn("event_hash", ev1)
        self.assertIn("signature", ev1)

        ev2 = mint_offline_event(
            asset_npid="NP-7K2M4QX9",
            action="SERVICE_EVENT",
            unit_label="Unit 402",
            tech_id="tech_morales",
            prev_event_hash=ev1["event_hash"]
        )
        self.assertEqual(ev2["prev_hash"], ev1["event_hash"])

    def test_batch_sheet_generator(self):
        """Test SVG print sheet generation with 30 tags."""
        svg = generate_printable_sheet_svg(count=30, batch_id="BATCH-TEST")
        self.assertIn('NAMEPLATE TAG PRINT SHEET', svg)
        self.assertIn('tag-30', svg)

if __name__ == "__main__":
    unittest.main()
