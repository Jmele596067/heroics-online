from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("Heroics", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Heroics-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))

NAVY = colors.HexColor("#0B1020")
INK = colors.HexColor("#172033")
GOLD = colors.HexColor("#C6942E")
PALE_GOLD = colors.HexColor("#F6E8BF")
CYAN = colors.HexColor("#1AA6C9")
RED = colors.HexColor("#D93645")
PALE = colors.HexColor("#F4F6FA")
MID = colors.HexColor("#DCE2EC")
WHITE = colors.white


def load_game_data() -> dict:
    expression = """
      import { allCards } from './src/cards.ts';
      import { EVOLUTIONS } from './src/evolution.ts';
      console.log(JSON.stringify({cards: allCards, evolutions: EVOLUTIONS}));
    """
    result = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", expression],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


STYLES = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "HeroicsTitle",
    parent=STYLES["Title"],
    fontName="Heroics-Bold",
    fontSize=25,
    leading=29,
    textColor=NAVY,
    alignment=TA_CENTER,
    spaceAfter=9,
)
SUBTITLE = ParagraphStyle(
    "HeroicsSubtitle",
    fontName="Heroics",
    fontSize=10,
    leading=15,
    textColor=colors.HexColor("#596275"),
    alignment=TA_CENTER,
    spaceAfter=18,
)
H1 = ParagraphStyle(
    "HeroicsH1",
    fontName="Heroics-Bold",
    fontSize=17,
    leading=21,
    textColor=NAVY,
    spaceBefore=10,
    spaceAfter=8,
)
H2 = ParagraphStyle(
    "HeroicsH2",
    fontName="Heroics-Bold",
    fontSize=12,
    leading=15,
    textColor=colors.HexColor("#704D12"),
    spaceBefore=8,
    spaceAfter=6,
)
BODY = ParagraphStyle(
    "HeroicsBody",
    fontName="Heroics",
    fontSize=8.5,
    leading=12.5,
    textColor=INK,
    spaceAfter=6,
)
SMALL = ParagraphStyle(
    "HeroicsSmall",
    fontName="Heroics",
    fontSize=7,
    leading=9.2,
    textColor=INK,
)
SMALL_BOLD = ParagraphStyle(
    "HeroicsSmallBold",
    parent=SMALL,
    fontName="Heroics-Bold",
)
CALLOUT = ParagraphStyle(
    "HeroicsCallout",
    parent=BODY,
    borderColor=GOLD,
    borderWidth=1,
    borderPadding=8,
    backColor=PALE_GOLD,
    spaceBefore=6,
    spaceAfter=10,
)


def p(text: str, style=BODY) -> Paragraph:
    return Paragraph(text, style)


def bullet(text: str) -> Paragraph:
    return Paragraph(f"• {text}", BODY)


def footer(canvas, doc):
    canvas.saveState()
    width, _ = letter
    canvas.setStrokeColor(MID)
    canvas.line(doc.leftMargin, 0.48 * inch, width - doc.rightMargin, 0.48 * inch)
    canvas.setFont("Heroics", 7)
    canvas.setFillColor(colors.HexColor("#667085"))
    canvas.drawString(doc.leftMargin, 0.30 * inch, "HEROICS TCG - ACTIVE BETA")
    canvas.drawRightString(width - doc.rightMargin, 0.30 * inch, f"Page {doc.page}")
    canvas.restoreState()


class HexCluster(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 500
        self.height = 230

    @staticmethod
    def points(cx: float, cy: float, side: float):
        return [
            (cx + side * math.cos(math.radians(30 + 60 * i)), cy + side * math.sin(math.radians(30 + 60 * i)))
            for i in range(6)
        ]

    def polygon(self, canvas, cx, cy, side, fill, stroke, width=2):
        pts = self.points(cx, cy, side)
        path = canvas.beginPath()
        path.moveTo(*pts[0])
        for point in pts[1:]:
            path.lineTo(*point)
        path.close()
        canvas.setFillColor(fill)
        canvas.setStrokeColor(stroke)
        canvas.setLineWidth(width)
        canvas.drawPath(path, fill=1, stroke=1)

    def draw(self):
        c = self.canv
        side = 43
        base = [(150, 113), (225, 113), (300, 113)]
        legal = [(188, 178), (263, 178), (188, 48), (263, 48)]
        illegal = [(113, 178), (338, 178), (113, 48), (338, 48)]
        for cx, cy in base:
            self.polygon(c, cx, cy, side, colors.HexColor("#18243A"), colors.HexColor("#E7ECF4"), 2)
        for cx, cy in legal:
            self.polygon(c, cx, cy, side, colors.HexColor("#164C5E"), CYAN, 2)
        for cx, cy in illegal:
            self.polygon(c, cx, cy, side, colors.HexColor("#3A1720"), RED, 2)
            c.setStrokeColor(RED)
            c.setLineWidth(5)
            c.line(cx-20, cy-20, cx+20, cy+20)
            c.line(cx-20, cy+20, cx+20, cy-20)
        c.setFillColor(WHITE)
        c.setFont("Heroics-Bold", 7)
        c.drawCentredString(150, 110, "HOME")
        c.drawCentredString(225, 110, "CENTER")
        c.drawCentredString(300, 110, "ENEMY")
        c.setFillColor(INK)
        c.setFont("Heroics", 7)
        c.drawCentredString(250, 224, "FIXED 2-3-2 FIELD • FOUR LEGAL ZONES • FOUR FORBIDDEN GATE-BACK CELLS")
        c.setFillColor(CYAN)
        c.drawCentredString(432, 132, "BLUE = LEGAL ZONE")
        c.setFillColor(RED)
        c.drawCentredString(432, 112, "RED X = NEVER LEGAL")


def table(data, widths, header=True, font_size=7):
    converted = []
    for row_index, row in enumerate(data):
        converted.append([p(str(cell), SMALL_BOLD if header and row_index == 0 else SMALL) for cell in row])
    result = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "Heroics"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, MID),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Heroics-Bold"),
        ])
    for index in range(1 if header else 0, len(data)):
        if index % 2 == 0:
            commands.append(("BACKGROUND", (0, index), (-1, index), PALE))
    result.setStyle(TableStyle(commands))
    return result


def title_block(title, subtitle):
    return [Spacer(1, 0.25 * inch), p("HEROICS", TITLE), p(title, H1), p(subtitle, SUBTITLE)]


def card_rows(cards):
    rows = [["Card", "Type / Cost", "Stats", "Rules"]]
    for card in cards:
        stats = f"{card.get('attack', '-')} / {card.get('health', '-')}" if card["kind"] == "unit" else "-"
        kind = f"{card['kind'].title()} / {card['cost']} Essence"
        traits = ", ".join(card.get("traits", []))
        rules = card["text"] + (f" Traits: {traits}." if traits else "")
        rows.append([card["name"], kind, stats, rules])
    return rows


def build_complete_guide(data):
    path = OUTPUT / "Heroics_Card_Codex_and_Field_Guide.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        rightMargin=34,
        leftMargin=34,
        topMargin=38,
        bottomMargin=42,
        title="Heroics Complete Card and Field Guide",
        author="Heroics TCG",
    )
    story = title_block(
        "Complete Card, Leader, and Battlefield Guide",
        "Rules baseline for the connected hex-cluster beta build",
    )
    story.extend([
        p("What this guide contains", H1),
        p("Every current card definition, every Leader evolution form, the two-phase turn structure, keyword rulings, and a step-by-step walkthrough of the connected battlefield."),
        p("Core match setup", H2),
        bullet("Choose any Leader, then build exactly 40 cards from the complete library with no more than three copies of one card. Every Leader can use every card."),
        bullet("Each player draws five cards. Both Leader portraits and the three original edge-connected hexes are visible immediately."),
        bullet("Deploy Units and Equipment in Deploy; move, attack, and activate abilities in Battle. Magic is legal in either phase."),
        bullet("Evolution is activated at will when ready and is limited to once per turn."),
        PageBreak(),
        p("Battlefield cluster walkthrough", H1),
        HexCluster(),
        p("1. Start with three point-top hexes. Their sides touch along complete lines; touching corners do not connect."),
        p("2. Play a Zone card during Deploy. Only the four fixed cells above and below the gaps between the original three Gate tiles are legal."),
        p("3. Choose a glowing edge. The new Zone is committed only after the edge is selected, then becomes part of the same movement and combat graph."),
        p("4. The four red-X cells behind the Home and Enemy Gates are permanently forbidden. A rejected placement spends neither the Zone card nor Essence."),
        p("5. Summoned Unit artwork appears directly on the destination hex. There are no empty slot frames or labels. Each team may have up to three Units on one tile."),
        p("6. Movement follows shared edges. A contested tile blocks departure and stops multi-tile movement unless Sneak, Dive, or another rule overrides it."),
        p("7. Normal Unit combat occurs on the same tile. Range can reach one adjacent tile. A Unit can attack the enemy Leader only from the enemy's original Gate hex."),
        p("The battlefield is permanently limited to the reference 2–3–2 seven-tile footprint. Placed Zones never unlock an outer ring. Meteor Drop can destroy only an added Zone whose removal keeps the remaining field connected.", CALLOUT),
        PageBreak(),
        p("Turn structure and timing", H1),
        table([
            ["Step", "Allowed actions", "Important limits"],
            ["Deploy Phase", "Summon Units; play Equipment and Zone cards; cast Magic.", "Unit and Equipment cards are Deploy-only. Zone placement must attach to the cluster."],
            ["Battle Phase", "Move; attack; activate Leader and Unit abilities; cast Magic.", "Attacks can be targeted and canceled. No counterattacks."],
            ["End Turn", "Resolve Wildfire, Kraken Maelstrom, temporary effects, and pass priority.", "Ability Points and ready status refresh on the next controller turn."],
        ], [1.05*inch, 2.65*inch, 3.1*inch]),
        p("Keyword rulings", H1),
        table([
            ["Keyword", "Ruling"],
            ["Zone Bound", "Summon only to a matching controlled Zone with room. Kraken requires Water."],
            ["Dive", "May leave a contested Water tile and move through connected Water space."],
            ["Electric Recoil N", "After being attacked, deal N Lightning damage to the attacker. It is a trigger, not a counterattack."],
            ["Tribute", "Sacrifice the named Unit as an additional requirement."],
            ["Ship", "Can use Lighthouse and Siren's Echo; Kraken Maelstrom destroys Ships sharing its tile."],
            ["Range", "May attack a Unit one edge-connected tile away."],
            ["Stun / Freeze", "The Unit is exhausted during its next ready step."],
        ], [1.55*inch, 5.25*inch]),
        PageBreak(),
        p("Leader evolution forms", H1),
    ])
    labels = {"flame": "Ignis", "tide": "Shellgon", "undead": "Queen of the Dead", "storm": "Tempestfang"}
    for element, forms in data["evolutions"].items():
        story.append(p(labels[element], H2))
        rows = [["Level / Form", "HP", "ATK", "AP", "Ability and passive"]]
        for form in forms:
            rules = f"{form['ability']}: {form['passive']}"
            rows.append([f"{form['level']} - {form['form']}", form["maxHealth"], form["attack"], form["abilityPoints"], rules])
        story.append(table(rows, [1.35*inch, .5*inch, .5*inch, .45*inch, 4.0*inch]))
        story.append(Spacer(1, 8))
    story.extend([PageBreak(), p("Complete card list", H1), p("Unit statistics are shown as ATK / HP. A dash means the card is not a Unit.")])
    groups = [
        ("flame", "Fire cards"),
        ("tide", "Water cards"),
        ("storm", "Thunder cards"),
        ("undead", "Death cards"),
        ("neutral", "Neutral Zone cards"),
    ]
    for element, label in groups:
        cards = [card for card in data["cards"] if card["element"] == element]
        story.append(p(label, H2))
        story.append(table(card_rows(cards), [1.35*inch, 1.05*inch, .62*inch, 3.78*inch]))
        story.append(Spacer(1, 10))
    story.extend([
        PageBreak(),
        p("Beta implementation notes", H1),
        p("The supplied update did not include costs for several cards. The playable beta uses these explicit tuning values: Siren's Echo 2, Aqua Burst 2, Cold Snap 2, Kraken's Call 6, Pearl Amulet 3, Pulse Barrier 2, and Heatwave 3 Essence.", CALLOUT),
        p("The six attributes are Fire, Water, Lightning, Death, Earth, and Divine. Attributes describe card identity and interactions; they do not restrict which Leader may include a card."),
        p("Click a Leader for current stats, evolution, abilities, Equipment, and statuses. Click the Grave count for the public Graveyard and Cemetery browser. Open Battle Chronicle whenever you want a full event history. A Zone inspector closes with its X button or Escape."),
        p("Choose Watch AI vs AI from the title screen to spectate the selected Leaders. Both CPUs visibly perform Deploy and Battle actions. Pause or resume the match while inspecting Units, Zones, Leaders, graveyards, or the Chronicle."),
    ])
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


def build_update_sheet(data):
    path = OUTPUT / "Heroics_Beta_Update_Sheet.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        rightMargin=42,
        leftMargin=42,
        topMargin=42,
        bottomMargin=44,
        title="Heroics Beta Update Sheet",
        author="Heroics TCG",
    )
    story = title_block("Beta Update Sheet", "Universal deck building, Zone inspector fix, and AI-vs-AI spectator update")
    story.extend([
        p("Update result", H1),
        p("Heroics now uses one edge-connected physical hex cluster in local and online matches. The visible battlefield is clean: hex art, summoned Unit art, and active placement indicators only."),
        table([
            ["Area", "What changed"],
            ["Starting battle", "Draw 5 cards; display both Leader portraits; display the original 3-hex cluster."],
            ["Zone placement", "Limited to four fixed cells in a 2–3–2 footprint. The four outer cells behind either Gate display red X and are always rejected."],
            ["Unit display", "Card artwork appears directly on the hex. Empty slots, frames, Gate numbers, and tile labels were removed."],
            ["Capacity", "Up to 3 Units per team per tile, enforced by game logic rather than visible slot boxes."],
            ["Movement", "Full-edge adjacency only. Contested tiles block departure and stop longer paths."],
            ["Combat", "Physical same-tile targeting works on original and added Zones. Range reaches one adjacent tile. No counterattacks."],
            ["Zone information", "The Zone side panel now dismisses correctly with its X button or Escape."],
            ["Deck customization", "Every Leader may use every card. The 40-card total and three-copy limit still apply offline and online."],
            ["AI vs AI", "A title-screen spectator mode runs both CPUs through visible Deploy and Battle actions with pause, resume, board inspection, Chronicle access, replay, and exit controls."],
            ["Online", "The server validates the same placement, targeting, movement, and 40-card rules."],
        ], [1.35*inch, 5.35*inch]),
        p("New card content", H1),
        table([
            ["Set", "Units", "Magic", "Equipment", "Zones", "Total new"],
            ["Water", "6", "6", "4", "1", "17"],
            ["Thunder", "7", "9", "4", "1", "21"],
            ["Fire", "8", "4", "5", "0", "17"],
            ["Total", "21", "19", "13", "2", "55"],
        ], [1.15*inch, .85*inch, .85*inch, 1.0*inch, .8*inch, 1.05*inch]),
        p("New systems", H1),
        bullet("Zone Bound: Kraken requires a controlled Water Zone."),
        bullet("Dive: bypass contested departure while moving through Water."),
        bullet("Electric Recoil: reactive Lightning damage without restoring counterattacks."),
        bullet("Tribute: Phoenix Hatchling calls Phoenix; Ember Samurai pays for Flame Shogun."),
        bullet("Leader Equipment: Lightning Rod Staff and Cinder Mask create Leader-specific synergies."),
        bullet("Tile effects: Lighthouse, Static Field, Pulse Barrier, Electric Trap, Rain, Wildfire, and Heatwave."),
        bullet("Universal card pool: attributes and factions create synergies but no longer lock cards to a Leader."),
        p("How a player uses the new board", H1),
        p("1. In Deploy, click a Zone card and choose one glowing edge. Do not click a red-X position."),
        p("2. Click a Unit card and play it. Standard Units appear on the starting Gate hex. Kraken requires a selected friendly Water Zone; Ship Units can use Lighthouse."),
        p("3. In Battle, click a Unit image to open its inspector. Choose Move or Attack from that inspector or the action controls."),
        p("4. For movement, select a connected destination. A longer move stops when it first reaches a contested tile."),
        p("5. For combat, press Attack, click a legal enemy Unit, then Confirm Attack. Cancel returns to normal Battle selection without ending the turn."),
        p("6. Click a selected Zone again for its rules. Click a Leader for stats and abilities. Click the Grave count to inspect public piles."),
        p("Balance assumptions", H1),
        p("Cards whose costs were omitted received beta values so the full set is playable: Siren's Echo 2, Aqua Burst 2, Cold Snap 2, Kraken's Call 6, Pearl Amulet 3, Pulse Barrier 2, and Heatwave 3 Essence.", CALLOUT),
        p("Validation completed", H1),
        bullet("Focused rules assertions for the exact four legal cells and four permanent red-X Gate-back cells."),
        bullet("Focused checks for Zone Bound, Recoil, Tribute, Static Field, Fire discounts, Water scaling, and Kraken Maelstrom."),
        bullet("200 automated AI matches with no stalls."),
        bullet("A full AI-vs-AI spectator simulation verifies both CPUs enter Deploy and Battle and reach a winner without stalling."),
        bullet("A mixed-attribute deck check verifies offline construction and online server acceptance."),
        bullet("Two-client online checks for private perspectives, turn validation, reconnect, surrender, and rematch."),
        bullet("TypeScript and production build checks."),
        p("Updating the live Render beta", H1),
        p("Commit and push this tested revision to the main branch of the GitHub repository connected to Render. If Render auto-deploy is enabled, it will build the new commit automatically. Otherwise, open the Render service and choose Manual Deploy - Deploy latest commit. Wait for the health check to pass, then test one private room with two browser windows."),
        p("Keep the BETA label, noindex metadata, free-plan service settings, and current WebSocket endpoint unchanged.", CALLOUT),
    ])
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


if __name__ == "__main__":
    game_data = load_game_data()
    complete = build_complete_guide(game_data)
    update = build_update_sheet(game_data)
    print(complete)
    print(update)
