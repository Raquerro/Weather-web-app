from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import CHECK_INTERVAL_HOURS
from sms_sender import run_sms_check
import logging

logger = logging.getLogger("scheduler")

def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_sms_check,
        trigger="interval",
        hours=CHECK_INTERVAL_HOURS,
        id="sms_check",
        name="Sprawdzenie pogody i wysylanie SMS",
        replace_existing=True,
    )
    return scheduler