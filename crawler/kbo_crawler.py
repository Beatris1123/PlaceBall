"""
PLACEBALL - KBO 경기일정 크롤러 v4
==================================================
- 구장은 tds[7] 파싱 대신 홈팀(오른쪽 팀) 기준으로 자동 매핑
  → 크롤러가 구장 셀을 못 읽어도 항상 정확한 구장명 저장
"""

import os
import re
import sys
import time
from datetime import date, datetime

import pymysql
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

load_dotenv()

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "db":       os.getenv("DB_NAME",     "placeball"),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", "1234"),
    "charset":  "utf8mb4",
}

# ── 팀명 정규화 ──────────────────────────────────────────────
TEAM_MAP = {
    "KIA": "KIA", "기아": "KIA",
    "LG": "LG",
    "삼성": "삼성",
    "두산": "두산",
    "롯데": "롯데",
    "SSG": "SSG", "SK": "SSG",
    "NC": "NC",
    "KT": "KT",
    "한화": "한화",
    "키움": "키움", "히어로즈": "키움", "넥센": "키움",
}

# ── 홈팀 → 구장 고정 매핑 ────────────────────────────────────
# KBO 규정: 오른쪽 팀이 항상 홈팀, 홈구장에서 경기
HOME_STADIUM_MAP = {
    "KIA":  "광주기아챔피언스필드",
    "LG":   "잠실야구장",
    "두산":  "잠실야구장",
    "삼성":  "대구삼성라이온즈파크",
    "롯데":  "사직야구장",
    "한화":  "대전한화생명볼파크",
    "SSG":  "인천SSG랜더스필드",
    "NC":   "창원NC파크",
    "KT":   "수원KT위즈파크",
    "키움":  "고척스카이돔",
}

def get_stadium(home_team: str) -> str:
    """홈팀명으로 구장을 자동 반환. 없으면 '미정'."""
    return HOME_STADIUM_MAP.get(home_team, "미정")

def normalize_team(raw: str) -> str | None:
    raw = raw.strip()
    for k, v in TEAM_MAP.items():
        if raw == k or raw.startswith(k):
            return v
    return None


# ── play 셀 파싱 ─────────────────────────────────────────────
def parse_play_cell(text: str):
    """
    'NC1vs5LG'    → away='NC', away_score=1, home='LG', home_score=5
    'KIA3vs2한화'  → away='KIA', away_score=3, home='한화', home_score=2
    'NC vs LG'    → away='NC', away_score=None, home='LG', home_score=None
    """
    text = text.strip()

    # 패턴 1: 팀명 + 숫자 + vs + 숫자 + 팀명  (예: NC1vs5LG)
    m = re.match(r"([가-힣A-Za-z]+?)(\d+)vs(\d+)([가-힣A-Za-z]+)", text, re.IGNORECASE)
    if m:
        away_raw, away_sc, home_sc, home_raw = m.groups()
        away = normalize_team(away_raw)
        home = normalize_team(home_raw)
        if away and home:
            return away, int(away_sc), home, int(home_sc)

    # 패턴 2: 팀명 + vs + 팀명  (점수 없음, 예정 경기)
    m = re.match(r"([가-힣A-Za-z]+?)\s*vs\s*([가-힣A-Za-z]+)", text, re.IGNORECASE)
    if m:
        away_raw, home_raw = m.groups()
        away = normalize_team(away_raw)
        home = normalize_team(home_raw)
        if away and home:
            return away, None, home, None

    return None, None, None, None


# ── Selenium 드라이버 ────────────────────────────────────────
def init_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    local_driver = os.path.join(os.path.dirname(__file__), "chromedriver.exe")
    if os.path.exists(local_driver):
        service = Service(local_driver)
        print(f"  로컬 chromedriver 사용: {local_driver}")
    else:
        service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


# ── 핵심 크롤링 함수 ─────────────────────────────────────────
def crawl_month(driver: webdriver.Chrome, year: int, month: int) -> list[dict]:
    url = "https://www.koreabaseball.com/Schedule/Schedule.aspx"
    print(f"\n[크롤링] {year}년 {month}월")

    driver.get(url)
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.ID, "tblScheduleList"))
    )
    time.sleep(1.5)

    try:
        series_sel = driver.find_element(By.ID, "ddlSeries")
        Select(series_sel).select_by_value("0,9,6")
        time.sleep(1.0)
    except Exception:
        pass

    try:
        Select(driver.find_element(By.ID, "ddlYear")).select_by_value(str(year))
        time.sleep(1.5)
    except Exception as e:
        print(f"  ⚠ 년도 변경 실패: {e}")

    try:
        Select(driver.find_element(By.ID, "ddlMonth")).select_by_value(str(month).zfill(2))
        time.sleep(2.0)
    except Exception as e:
        print(f"  ⚠ 월 변경 실패: {e}")
        return []

    soup = BeautifulSoup(driver.page_source, "lxml")
    return parse_schedule_table(soup, year, month)


# ── 테이블 파싱 ──────────────────────────────────────────────
def parse_schedule_table(soup: BeautifulSoup, year: int, month: int) -> list[dict]:
    table = soup.find("table", id="tblScheduleList")
    if not table:
        print("  ⚠ tblScheduleList 테이블을 찾지 못했습니다.")
        return []

    tbody  = table.find("tbody") or table
    rows   = tbody.find_all("tr")
    print(f"  → {len(rows)}행 발견")

    games        = []
    current_date = None

    for row in rows:
        tds = row.find_all("td")
        if not tds:
            continue

        # ── 날짜 파싱 ──
        day_td = row.find("td", class_="day")
        if day_td:
            raw = day_td.get_text(strip=True)
            m = re.search(r"(\d{1,2})[./](\d{1,2})", raw)
            if m:
                mm = m.group(1).zfill(2)
                dd = m.group(2).zfill(2)
                current_date = f"{year}-{mm}-{dd}"

        if not current_date:
            continue

        # ── 시간 파싱 ──
        time_td = row.find("td", class_="time")
        game_time = None
        if time_td:
            t = time_td.get_text(strip=True)
            if re.match(r"\d{1,2}:\d{2}", t):
                game_time = t

        # ── 팀명 + 점수 파싱 ──
        play_td = row.find("td", class_="play")
        if not play_td:
            continue

        play_text = play_td.get_text(strip=True)
        away_team, away_score, home_team, home_score = parse_play_cell(play_text)

        if not away_team or not home_team:
            print(f"  ⚠ 팀명 파싱 실패: '{play_text}'")
            continue

        # ── 구장: 홈팀(오른쪽 팀) 기준 자동 매핑 ──
        # tds[7] 파싱 시도하되, 실패하거나 비어있으면 홈팀 기준으로 결정
        venue = get_stadium(home_team)  # 홈팀 기준 우선 적용
        if not venue or venue == "미정":
            # 혹시 크롤러가 가져온 값이 있으면 보조로 사용
            if len(tds) > 7:
                raw_venue = tds[7].get_text(strip=True)
                if raw_venue:
                    venue = raw_venue

        # ── 경기 상태 판정 ──
        status = determine_status(current_date, game_time, away_score, home_score)

        game = {
            "game_date":  current_date,
            "game_time":  game_time,
            "home_team":  home_team,
            "away_team":  away_team,
            "home_score": home_score,
            "away_score": away_score,
            "status":     status,
            "venue":      venue,
            "inning":     None,
            "weather":    None,
        }
        games.append(game)

        score_txt = f"{away_score}:{home_score}" if away_score is not None else "예정"
        print(f"  ✓ {current_date} {away_team} {score_txt} {home_team} [{status}] @ {venue}")

    print(f"  → 총 {len(games)}경기 파싱")
    return games


def determine_status(date_str, time_str, away_score, home_score) -> str:
    today = date.today()
    try:
        gd = date.fromisoformat(date_str)
    except ValueError:
        return "upcoming"

    if gd > today:
        return "upcoming"
    if gd < today:
        return "finished" if away_score is not None else "canceled"

    now = datetime.now().time()
    if time_str:
        try:
            hh, mm = map(int, time_str.split(":"))
            start = datetime.now().replace(hour=hh, minute=mm, second=0).time()
            if now < start:
                return "upcoming"
            if away_score is not None:
                return "finished" if now.hour >= (hh + 3) % 24 else "live"
        except ValueError:
            pass
    return "upcoming"


# ── DB 저장 ──────────────────────────────────────────────────
def save_to_db(games: list[dict]) -> None:
    if not games:
        print("[DB] 저장할 데이터 없음")
        return

    conn   = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    upsert_sql = """
        INSERT INTO game
            (game_date, game_time, home_team, away_team,
             home_score, away_score, status, venue, inning, weather)
        VALUES
            (%(game_date)s, %(game_time)s, %(home_team)s, %(away_team)s,
             %(home_score)s, %(away_score)s, %(status)s, %(venue)s,
             %(inning)s, %(weather)s)
        ON DUPLICATE KEY UPDATE
            game_time   = VALUES(game_time),
            home_score  = VALUES(home_score),
            away_score  = VALUES(away_score),
            status      = VALUES(status),
            venue       = VALUES(venue),
            inning      = VALUES(inning),
            weather     = VALUES(weather)
    """

    inserted = updated = 0
    for g in games:
        cursor.execute(upsert_sql, g)
        if cursor.rowcount == 1:
            inserted += 1
        elif cursor.rowcount == 2:
            updated += 1

    conn.commit()
    cursor.close()
    conn.close()
    print(f"[DB] 신규 {inserted}건 / 업데이트 {updated}건 저장 완료")


# ── 메인 ─────────────────────────────────────────────────────
def build_targets(args):
    today = date.today()
    if not args:
        return [(today.year, today.month)]
    if len(args) == 2:
        return [(int(args[0]), int(args[1]))]
    if len(args) == 4:
        y1, m1, y2, m2 = map(int, args)
        result, y, m = [], y1, m1
        while (y, m) <= (y2, m2):
            result.append((y, m))
            m += 1
            if m > 12:
                m, y = 1, y + 1
        return result
    print("사용법: python kbo_crawler.py [year month [year2 month2]]")
    sys.exit(1)


def main():
    targets = build_targets(sys.argv[1:])
    print("=" * 50)
    print("PLACEBALL KBO 크롤러 시작")
    print(f"대상: {targets}")
    print("=" * 50)

    driver    = init_driver()
    all_games = []
    try:
        for year, month in targets:
            games = crawl_month(driver, year, month)
            all_games.extend(games)
            time.sleep(2)
    except Exception as e:
        print(f"\n⛔ 오류 발생: {e}")
        import traceback; traceback.print_exc()
    finally:
        driver.quit()

    if all_games:
        save_to_db(all_games)

    print(f"\n완료: 총 {len(all_games)}경기 처리")


if __name__ == "__main__":
    main()
