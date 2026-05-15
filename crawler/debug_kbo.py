"""
KBO 사이트 HTML 구조 디버거
실행하면 실제 페이지 소스를 저장해서 셀렉터를 직접 확인할 수 있습니다.

사용법: python debug_kbo.py
"""
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def main():
    options = Options()
    # ★ 디버깅 시에는 headless 끄기 (실제 브라우저 표시)
    # options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    )
    # chromedriver.exe를 같은 폴더에 넣었으면 아래 경로 사용
    # 없으면 webdriver-manager 자동 설치 시도
    import os
    local_driver = os.path.join(os.path.dirname(__file__), "chromedriver.exe")
    if os.path.exists(local_driver):
        service = Service(local_driver)
        print(f"로컬 chromedriver 사용: {local_driver}")
    else:
        service = Service(ChromeDriverManager().install())
        print("webdriver-manager로 chromedriver 자동 설치")
    driver  = webdriver.Chrome(service=service, options=options)

    try:
        url = "https://www.koreabaseball.com/Schedule/Schedule.aspx"
        print(f"접속 중: {url}")
        driver.get(url)
        time.sleep(3)

        # ── 1. 셀렉트 박스 id 목록 출력 ──
        print("\n[셀렉트 박스 목록]")
        selects = driver.find_elements(By.TAG_NAME, "select")
        for s in selects:
            print(f"  id={s.get_attribute('id')!r}, name={s.get_attribute('name')!r}")
            opts = s.find_elements(By.TAG_NAME, "option")
            for o in opts[:5]:
                print(f"    value={o.get_attribute('value')!r}, text={o.text!r}")

        # ── 2. 테이블 목록 출력 ──
        print("\n[테이블 목록]")
        soup = BeautifulSoup(driver.page_source, "lxml")
        for t in soup.find_all("table"):
            print(f"  id={t.get('id')!r}, class={t.get('class')}")

        # ── 3. 첫 번째 경기 행 구조 출력 ──
        print("\n[첫 번째 tr 구조]")
        first_tr = soup.find("tbody").find("tr") if soup.find("tbody") else None
        if first_tr:
            for i, td in enumerate(first_tr.find_all("td")):
                print(f"  td[{i}] class={td.get('class')} | text={td.get_text(strip=True)!r}")

        # ── 4. 전체 HTML 저장 ──
        with open("kbo_page_source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        print("\n✅ kbo_page_source.html 저장 완료 — 브라우저로 열어서 구조 확인하세요!")

        # ── 5. 월 변경 후 재저장 ──
        try:
            month_sel = driver.find_element(By.CSS_SELECTOR, "select[id*='Month']")
            Select(month_sel).select_by_value("05")
            time.sleep(2)
            soup2 = BeautifulSoup(driver.page_source, "lxml")
            rows = soup2.find("tbody").find_all("tr") if soup2.find("tbody") else []
            print(f"\n5월 선택 후 tr 수: {len(rows)}")
            if rows:
                print("[첫 번째 tr 구조 (5월)]")
                for i, td in enumerate(rows[0].find_all("td")):
                    print(f"  td[{i}] class={td.get('class')} | text={td.get_text(strip=True)!r}")
        except Exception as e:
            print(f"월 변경 실패: {e}")

    finally:
        input("\n[Enter] 키를 누르면 브라우저가 닫힙니다...")
        driver.quit()

if __name__ == "__main__":
    main()
