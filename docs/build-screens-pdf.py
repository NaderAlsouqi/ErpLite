"""Build a screenshots PDF from a pages json + screenshots dir, with Arabic (RTL) support.
Usage: python build-screens-pdf.py <pages.json> <shots_dir> <out.pdf> [rtl]"""
import json, os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image,
                                PageBreak, KeepInFrame)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = os.path.dirname(__file__)
pages_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'pages.json')
shots_dir  = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'screenshots')
out_path   = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'Pages.pdf')
RTL        = len(sys.argv) > 4 and sys.argv[4] in ('1', 'rtl', 'ar')

# Arabic-capable font
pdfmetrics.registerFont(TTFont('AppFont', 'C:/Windows/Fonts/tahoma.ttf'))
try:
    pdfmetrics.registerFont(TTFont('AppFont-Bold', 'C:/Windows/Fonts/tahomabd.ttf'))
except Exception:
    pdfmetrics.registerFont(TTFont('AppFont-Bold', 'C:/Windows/Fonts/tahoma.ttf'))

def ar(t):
    return get_display(arabic_reshaper.reshape(str(t))) if RTL else str(t)

ALIGN = TA_RIGHT if RTL else TA_LEFT
styles = getSampleStyleSheet()
S_SECTION = ParagraphStyle('Section', fontName='AppFont-Bold', fontSize=15, textColor=colors.HexColor('#1b2b4a'),
                           alignment=ALIGN, spaceBefore=6, spaceAfter=8, leading=20)
S_TITLE   = ParagraphStyle('PageTitle', fontName='AppFont-Bold', fontSize=12.5, textColor=colors.HexColor('#0d2a66'),
                           alignment=ALIGN, spaceBefore=4, spaceAfter=2, leading=17)
S_ROUTE   = ParagraphStyle('Route', fontName='Courier', fontSize=8.5, textColor=colors.HexColor('#c0392b'),
                           alignment=TA_LEFT, spaceAfter=2, leading=11)
S_BODY    = ParagraphStyle('Body', fontName='AppFont', fontSize=10, alignment=ALIGN, spaceAfter=8, leading=15)
S_NA      = ParagraphStyle('NA', fontName='AppFont', fontSize=10, alignment=ALIGN, textColor=colors.HexColor('#996600'),
                           spaceAfter=8, leading=15)
S_ERR     = ParagraphStyle('Err', fontName='AppFont-Bold', fontSize=10, alignment=ALIGN, textColor=colors.HexColor('#c00000'),
                           spaceAfter=8, leading=15)
S_COVER   = ParagraphStyle('Cover', fontName='AppFont-Bold', fontSize=22, alignment=TA_CENTER, spaceAfter=14, leading=28)

L = {
  'cover': 'مرجع شاشات النظام' if RTL else 'ErpLite — Pages Reference',
  'intro': 'لقطة شاشة ووصف لكل صفحة في النظام، مأخوذة من التطبيق أثناء التشغيل (تعكس بيانات تجريبية).' if RTL
           else 'Screenshot and description of every page in the system. Captured from the running application; screens reflect sample/test data.',
  'na': 'هذه الصفحة غير متاحة لصلاحيات هذا المستخدم.' if RTL else 'This page is not available for this user’s permissions.',
  # NOTE: Tahoma (the only PDF font) has no ⚠ glyph, so use ‼ which it does have.
  'err': '‼ سُجِّل خطأ في هذه الصفحة أثناء الالتقاط — للمراجعة والإصلاح لاحقاً.' if RTL
         else '‼ An error was detected on this page during capture — to review/fix later.',
}

pages = json.load(open(pages_path, encoding='utf-8'))
res = {}
rpath = os.path.join(shots_dir, '_results.json')
if os.path.exists(rpath):
    for r in json.load(open(rpath, encoding='utf-8')):
        if isinstance(r, dict) and r.get('route'):
            res[r['route']] = r

doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.4*cm, rightMargin=1.4*cm,
                        topMargin=1.4*cm, bottomMargin=1.4*cm, title='Pages Reference')
CONTENT_W = A4[0] - 2.8*cm
IMG_MAX_H = A4[1] - 2.8*cm - 5.0*cm   # leave room for the text above the image

import html

def rtl_par(text, style, max_width=CONTENT_W):
    """Build a Paragraph with correct Arabic line order.

    reportlab cannot wrap bidi text: if we hand it get_display()'d (already
    reversed) text, its own left-to-right wrapping flips the line order. So we
    reshape, wrap into lines ourselves by measured width, apply the bidi
    algorithm PER LINE, and join with <br/> so reportlab never re-wraps. """
    if not RTL:
        return Paragraph(html.escape(str(text)), style)
    reshaped = arabic_reshaper.reshape(str(text))
    fn, fs = style.fontName, style.fontSize
    limit = max_width - 6          # small safety margin so a line never overflows + re-wraps
    lines, cur = [], ''
    for word in reshaped.split(' '):
        trial = (cur + ' ' + word) if cur else word
        if not cur or pdfmetrics.stringWidth(trial, fn, fs) <= limit:
            cur = trial
        else:
            lines.append(cur); cur = word
    if cur:
        lines.append(cur)
    visual = [html.escape(get_display(ln)) for ln in lines]
    return Paragraph('<br/>'.join(visual) or '&nbsp;', style)

flow = [Spacer(1, 5*cm), rtl_par(L['cover'], S_COVER), rtl_par(L['intro'], S_BODY), PageBreak()]

current = None
for pg in pages:
    s = pg.get('section', '')
    if s != current:
        flow.append(rtl_par(s, S_SECTION))
        current = s
    flow.append(rtl_par(pg['title'], S_TITLE))
    flow.append(Paragraph(pg['route'], S_ROUTE))
    flow.append(rtl_par(pg['desc'], S_BODY))

    info = res.get(pg['route'])
    if info and info.get('hadError'):
        flow.append(rtl_par(L['err'], S_ERR))
    redirected = info and isinstance(info.get('finalUrl'), str) and '/auth/login' in info['finalUrl']
    img = os.path.join(shots_dir, info['file']) if info and info.get('file') else None
    if (not redirected) and img and os.path.exists(img):
        iw, ih = ImageReader(img).getSize()
        w = CONTENT_W
        h = w * ih / iw
        im = Image(img, width=w, height=h)
        flow.append(KeepInFrame(CONTENT_W, IMG_MAX_H, [im], mode='shrink', hAlign='CENTER'))
    else:
        flow.append(rtl_par(L['na'], S_NA))
    flow.append(PageBreak())

doc.build(flow)
print('wrote', out_path, '(rtl=%s)' % RTL)
