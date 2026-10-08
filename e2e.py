"""スマホ表示での一連の操作を自動で確認する E2E スクリプト（Playwright）
   使い方: npm run build && npx vite preview --port 4173 & python3 scripts/e2e.py
"""
import sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
OUT = 'out/shots/'
errors = []

def shot(page, name):
    page.screenshot(path=OUT + name + '.png')

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, locale='ja-JP')
    page = ctx.new_page()
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.on('pageerror', lambda e: errors.append(str(e)))

    # ---- 基本フロー ----
    page.goto(BASE); page.wait_for_timeout(1200); shot(page, '01-home')
    page.get_by_role('button', name='塗り絵を探す').first.click(); page.wait_for_timeout(500); shot(page, '02-explore')
    page.get_by_role('tab', name='マンダラ').click(); page.wait_for_timeout(300)
    page.get_by_text('はじめてのマンダラ').click(); page.wait_for_timeout(500); shot(page, '03-detail')
    page.get_by_role('button', name='塗りはじめる').click()
    page.wait_for_selector('.cl-stage canvas', timeout=10000); page.wait_for_timeout(800)
    host = page.locator('.cl-stage').bounding_box()
    cx, cy = host['x'] + host['width'] / 2, host['y'] + host['height'] / 2
    def tap(x, y):
        page.touchscreen.tap(x, y); page.wait_for_timeout(380)  # ダブルタップ判定を避ける間隔
    # 色を選んで外側の花びらと中心を塗る
    page.get_by_role('button', name='色 #F9D9B5').click()
    tap(cx, host['y'] + host['height'] * 0.12)
    page.get_by_role('button', name='色 #BFD8EC').click()
    tap(cx + host['width'] * 0.3, cy)
    tap(cx, cy)
    shot(page, '04-filled')
    undo = page.get_by_role('button', name='元に戻す'); redo = page.get_by_role('button', name='やり直す')
    undo.click(); page.wait_for_timeout(200); shot(page, '05-undo')
    redo.click(); page.wait_for_timeout(200)
    # ブラシで線を描く（はみ出し防止あり）
    page.get_by_role('radio', name='ブラシ').click()
    page.get_by_role('button', name='色 #CFC8EA').click()
    page.mouse.move(cx - 60, cy + 60); page.mouse.down()
    for i in range(20): page.mouse.move(cx - 60 + i * 8, cy + 60 + (i % 5) * 6)
    page.mouse.up(); page.wait_for_timeout(300)
    shot(page, '06-brush')
    page.wait_for_timeout(2200)  # 自動保存
    status = page.locator('header [aria-live]').inner_text(); print('save status:', status)
    shot(page, '07-autosaved')
    page.get_by_role('button', name='完成').click()
    page.wait_for_url('**/done/**', timeout=8000); page.wait_for_timeout(800); shot(page, '08-complete')
    page.mouse.wheel(0, 800); page.wait_for_timeout(300); shot(page, '09-complete-actions')

    # ---- 再読み込み後も作品が残っているか ----
    page.goto(BASE + '#/works?tab=done'); page.reload(); page.wait_for_timeout(1000); shot(page, '10-works')
    done_count = page.locator('main button:has-text("完成・")').count(); print('completed works:', done_count)

    # ---- 写真フロー ----
    page.goto(BASE + '#/create'); page.wait_for_timeout(500)
    page.locator('#rights').check(); shot(page, '11-create')
    page.locator('#photo-file').set_input_files('out/photos/cat.png'); page.wait_for_timeout(800); shot(page, '12-options')
    page.get_by_role('button', name='細かく調整する').click(); page.wait_for_timeout(200); shot(page, '13-advanced')
    page.get_by_role("button", name="塗り絵を作る", exact=True).click(); page.wait_for_timeout(250); shot(page, '14-generating')
    page.wait_for_selector('text=この塗り絵で始める', timeout=20000); page.wait_for_timeout(500); shot(page, '15-preview')
    page.get_by_role('tab', name='元の写真').click(); page.wait_for_timeout(300); shot(page, '16-preview-photo')
    page.get_by_role('button', name='この塗り絵で始める').click()
    page.wait_for_selector('.cl-stage canvas', timeout=10000); page.wait_for_timeout(800)
    host = page.locator('.cl-stage').bounding_box()
    page.get_by_role('button', name='色 #F6C5C0').click()
    for fx, fy in [(0.2, 0.2), (0.5, 0.75), (0.8, 0.3), (0.35, 0.55)]:
        tap(host['x'] + host['width'] * fx, host['y'] + host['height'] * fy)
    shot(page, '17-photo-filled')
    # パレットシート
    page.get_by_role('button', name='いまの色').click(); page.wait_for_timeout(300); shot(page, '18-palette')
    page.get_by_role('button', name='色を作る').click(); page.wait_for_timeout(200); shot(page, '19-picker')
    page.get_by_role('button', name='閉じる').last.click(); page.wait_for_timeout(200)
    # ピンチの代わりにズームボタン
    page.get_by_role('button', name='拡大').click(); page.wait_for_timeout(400); shot(page, '20-zoom')
    page.get_by_role('button', name='完成').click(); page.wait_for_url('**/done/**', timeout=8000); page.wait_for_timeout(800); shot(page, '21-photo-complete')

    page.goto(BASE + '#/me'); page.wait_for_timeout(600); shot(page, '22-mypage')
    page.goto(BASE + '#/ai'); page.wait_for_timeout(300)
    page.get_by_text('幻想的な日本庭園').click(); page.get_by_role('button', name='線画を作る').click(); page.wait_for_timeout(300); shot(page, '23-ai')

    # ダークモード
    dark = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme='dark', has_touch=True, is_mobile=True)
    dp = dark.new_page(); dp.goto(BASE); dp.wait_for_timeout(1000); shot(dp, '24-home-dark')
    # PC 幅
    pc = b.new_context(viewport={'width': 1280, 'height': 800}); pp = pc.new_page(); pp.goto(BASE + '#/explore'); pp.wait_for_timeout(800); shot(pp, '25-explore-pc')
    b.close()

print('console errors:', errors or 'none')
