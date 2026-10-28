"""Unit tests for the Apify YouTube transcript path (no network).

Run with: python -m pytest tests/test_youtube_apify.py
"""
from unittest import mock

import pytest

from app import create_app
from app import routes


VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
OK_ROW = {"status": "OK", "videoId": "jNQXAC9IVRw", "title": "Me at the zoo",
          "text": "All right, so here we are, in front of the elephants"}


@pytest.fixture
def app_ctx(monkeypatch):
    monkeypatch.setenv("APIFY_API_TOKEN", "test-token")
    monkeypatch.delenv("APIFY_YOUTUBE_ACTOR_ID", raising=False)
    app = create_app()
    app.config["APIFY_API_TOKEN"] = "test-token"
    app.config["APIFY_YOUTUBE_ACTOR_ID"] = "shephouse~youtube-transcript-scraper-bulk"
    with app.app_context():
        yield


def _response(payload):
    resp = mock.Mock()
    resp.json.return_value = payload
    resp.raise_for_status.return_value = None
    return resp


def test_calls_default_actor_with_expected_input(app_ctx):
    with mock.patch.object(routes.http_requests, "post", return_value=_response([OK_ROW])) as post:
        items = routes._fetch_transcript_from_apify(VIDEO)

    url = post.call_args.args[0]
    assert "/acts/shephouse~youtube-transcript-scraper-bulk/run-sync-get-dataset-items" in url
    assert post.call_args.kwargs["json"] == {
        "startUrls": [{"url": VIDEO}], "languages": ["en"], "maxTranscripts": 1,
    }
    transcript, title = routes._extract_transcript_payload(items)
    assert title == "Me at the zoo"
    assert transcript.startswith("All right, so here we are")


def test_failed_row_falls_back_to_youtube_transcript_api(app_ctx):
    failed = [{"status": "FAILED", "errorCode": "NO_CAPTIONS",
               "errorMessage": "This video has no captions"}]
    with mock.patch.object(routes.http_requests, "post", return_value=_response(failed)), \
         mock.patch.object(routes, "_fetch_transcript_from_youtube_api", return_value="fallback") as fb:
        assert routes._fetch_transcript_from_apify(VIDEO) == "fallback"
    fb.assert_called_once_with(VIDEO)


def test_missing_token_skips_apify(app_ctx, monkeypatch):
    from flask import current_app
    current_app.config["APIFY_API_TOKEN"] = ""
    monkeypatch.delenv("APIFY_API_TOKEN")
    with mock.patch.object(routes.http_requests, "post") as post, \
         mock.patch.object(routes, "_fetch_transcript_from_youtube_api", return_value="fallback"):
        assert routes._fetch_transcript_from_apify(VIDEO) == "fallback"
    post.assert_not_called()
