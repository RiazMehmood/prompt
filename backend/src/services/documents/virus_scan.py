"""PDF virus scanning using ClamAV (pyclamd) with graceful fallback."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_CLAMAV_AVAILABLE = False
_clamd = None

try:
    import pyclamd
    _clamd = pyclamd.ClamdUnixSocket()
    _clamd.ping()
    _CLAMAV_AVAILABLE = True
    logger.info("ClamAV connected via Unix socket")
except Exception as exc:
    logger.warning("ClamAV unavailable (%s) — virus scanning disabled", exc)


class VirusScanService:
    """
    Scans uploaded files with ClamAV.
    If ClamAV is not running, scan is skipped with a warning log.
    Raises VirusDetectedError if a threat is found.
    """

    def scan(self, file_path: Path) -> None:
        """
        Scan file at path. Raises VirusDetectedError if infected.
        Silently passes if ClamAV is not available.
        """
        if not _CLAMAV_AVAILABLE or _clamd is None:
            logger.warning(
                "Virus scan skipped (ClamAV not available) for file=%s", file_path
            )
            return

        try:
            result = _clamd.scan_file(str(file_path))
        except Exception as exc:
            logger.error("ClamAV scan error for %s: %s", file_path, exc)
            return

        if result is None:
            # No threats found
            logger.debug("Virus scan clean: %s", file_path)
            return

        # result = {path: ('FOUND', 'Virus.Name')} when infected
        for path_key, scan_result in result.items():
            if scan_result[0] == "FOUND":
                threat_name = scan_result[1]
                logger.error(
                    "VIRUS DETECTED in %s: %s", file_path, threat_name
                )
                raise VirusDetectedError(
                    f"Malicious content detected: {threat_name}. Upload rejected."
                )


class VirusDetectedError(Exception):
    """Raised when ClamAV identifies a threat in an uploaded file."""
    pass
