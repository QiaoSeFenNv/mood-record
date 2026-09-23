import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

import generate


def png(rgb: bool) -> bytes:
    color_type = 2 if rgb else 6
    pixel = b"\x00\xff\x00\x00" if rgb else b"\x00\xff\x00\x00\x00"

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, color_type, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixel))
        + chunk(b"IEND", b"")
    )


class GenerateTests(unittest.TestCase):
    def test_rgb_checkerboard_cannot_pass_alpha_requirement(self) -> None:
        self.assertEqual(generate.alpha_status(png(rgb=True), "png"), "none")

    def test_accepted_task_is_polled_and_saved(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "image.png"
            responses = [
                {"id": "a" * 32},
                {"status": "pending"},
                {"status": "completed", "image_urls": ["https://example.invalid/image.png"]},
            ]
            with (
                patch.dict(os.environ, {"L0VEYOU_AUTH": "test-token"}),
                patch("sys.argv", ["generate.py", "--prompt", "test", "--aspect-ratio", "9:16", "--output", str(output)]),
                patch.object(generate, "request_json", side_effect=responses) as requests,
                patch.object(generate, "download", return_value=png(rgb=True)),
                patch.object(generate.time, "sleep"),
            ):
                self.assertEqual(generate.main(), 0)
                self.assertEqual(requests.call_count, 3)
            self.assertEqual(output.read_bytes(), png(rgb=True))

    def test_resume_does_not_submit_again_and_rejects_opaque_image(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "image.png"
            with (
                patch.dict(os.environ, {"L0VEYOU_AUTH": "test-token"}),
                patch("sys.argv", ["generate.py", "--task-id", "a" * 32, "--output", str(output), "--require-alpha"]),
                patch.object(generate, "request_json", return_value={"status": "completed", "image_urls": ["https://example.invalid/image.png"]}) as request,
                patch.object(generate, "download", return_value=png(rgb=True)),
            ):
                with self.assertRaisesRegex(RuntimeError, "without verified transparency"):
                    generate.main()
                self.assertEqual(request.call_count, 1)
                self.assertIsNone(request.call_args.args[3] if len(request.call_args.args) > 3 else None)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
