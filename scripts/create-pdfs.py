import json, os, sys, math
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'output','pdf');os.makedirs(OUT,exist_ok=True)
with open(sys.argv[1],encoding='utf-8') as f:data=json.load(f)

GOLD=colors.HexColor('#D7A63D');DARK=colors.HexColor('#171A26');INK=colors.HexColor('#24232A');MUTED=colors.HexColor('#66616B');PAPER=colors.HexColor('#FAF7F0')
ACC={'flame':'#A64228','tide':'#227B99','undead':'#683C73','storm':'#3E69A8','neutral':'#867047'}
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX',parent=styles['Title'],fontName='Helvetica-Bold',fontSize=26,leading=30,textColor=DARK,spaceAfter=12))
styles.add(ParagraphStyle(name='SubX',parent=styles['Normal'],fontSize=11,leading=16,textColor=MUTED,spaceAfter=10))
styles.add(ParagraphStyle(name='H1X',parent=styles['Heading1'],fontName='Helvetica-Bold',fontSize=19,leading=22,textColor=DARK,spaceBefore=8,spaceAfter=10))
styles.add(ParagraphStyle(name='H2X',parent=styles['Heading2'],fontName='Helvetica-Bold',fontSize=13,leading=16,textColor=colors.HexColor('#6D481E'),spaceBefore=6,spaceAfter=6))
styles.add(ParagraphStyle(name='BodyX',parent=styles['BodyText'],fontSize=9.2,leading=13,textColor=INK,spaceAfter=5))
styles.add(ParagraphStyle(name='SmallX',parent=styles['BodyText'],fontSize=7.7,leading=10.5,textColor=MUTED))
styles.add(ParagraphStyle(name='CardName',parent=styles['Heading3'],fontName='Helvetica-Bold',fontSize=10.3,leading=12,textColor=colors.white,spaceAfter=3))
styles.add(ParagraphStyle(name='CardText',parent=styles['BodyText'],fontSize=7.8,leading=10.2,textColor=INK))

def footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(colors.HexColor('#D8D1C5'));canvas.line(0.65*inch,0.48*inch,7.85*inch,0.48*inch)
    canvas.setFont('Helvetica',7);canvas.setFillColor(MUTED);canvas.drawString(0.65*inch,0.3*inch,'HEROICS - ACTIVE BETA RULES');canvas.drawRightString(7.85*inch,0.3*inch,f'Page {doc.page}');canvas.restoreState()

def doc(path,title):return SimpleDocTemplate(path,pagesize=letter,rightMargin=.58*inch,leftMargin=.58*inch,topMargin=.55*inch,bottomMargin=.62*inch,title=title,author='Heroics')
def cover(story,title,subtitle,label):
    story += [Spacer(1,1.15*inch),Paragraph(label,ParagraphStyle('coverlabel',parent=styles['SmallX'],alignment=TA_CENTER,textColor=GOLD,fontName='Helvetica-Bold',fontSize=10,leading=12,spaceAfter=14)),Paragraph(title,ParagraphStyle('covertitle',parent=styles['TitleX'],alignment=TA_CENTER,fontSize=34,leading=39)),Paragraph(subtitle,ParagraphStyle('coversub',parent=styles['SubX'],alignment=TA_CENTER,fontSize=13,leading=19)),Spacer(1,.35*inch)]
    box=Table([[Paragraph('<b>BETA EDITION</b><br/>Two-phase turns • Hex battlefield • Ability Points • 40-card decks',styles['BodyX'])]],colWidths=[5.8*inch]);box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F0E3C3')),('BOX',(0,0),(-1,-1),1,GOLD),('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),18),('BOTTOMPADDING',(0,0),(-1,-1),18)]));story += [box,PageBreak()]

def section(story,title,subtitle=None):
    story.append(Paragraph(title,styles['H1X']));
    if subtitle:story.append(Paragraph(subtitle,styles['SubX']))

class FieldDiagram(Flowable):
    def __init__(self):super().__init__();self.width=6.8*inch;self.height=2.55*inch
    def hex(self,c,x,y,r,label,fill='#FAF7F0'):
        pts=[]
        for i in range(6):
            a=math.radians(60*i);pts.extend([x+r*math.cos(a),y+r*math.sin(a)])
        p=c.beginPath();p.moveTo(pts[0],pts[1])
        for i in range(2,len(pts),2):p.lineTo(pts[i],pts[i+1])
        p.close();c.setFillColor(colors.HexColor(fill));c.setStrokeColor(colors.HexColor('#463A31'));c.setLineWidth(1.2);c.drawPath(p,fill=1,stroke=1)
        c.setFillColor(DARK);c.setFont('Helvetica-Bold',6.5);c.drawCentredString(x,y-2,label)
    def draw(self):
        c=self.canv;c.setFillColor(MUTED);c.setFont('Helvetica-Bold',7);c.drawString(5,self.height-10,'STARTING MAP - 3 HEXES')
        for x,label in [(120,'HOME GATE'),(188,'CENTER ZONE'),(256,'ENEMY GATE')]:self.hex(c,x,self.height-50,39,label)
        c.drawString(300,self.height-10,'EXPANDED MAP - UP TO 7 HEXES')
        nodes=[(365,68,'HOME GATE','#FAF7F0'),(433,68,'CENTER','#FAF7F0'),(501,68,'ENEMY GATE','#FAF7F0'),(399,127,'VOLCANO','#F6D6C9'),(467,127,'VOLCANO','#F6D6C9'),(399,9,'DESERT','#F2E4BB'),(467,9,'OCEAN','#CEE6EC')]
        for x,y,label,fill in nodes:self.hex(c,x,y,38,label,fill)
        c.setFillColor(MUTED);c.setFont('Helvetica',6.5);c.drawString(5,5,'Each hex contains 3 enemy slots and 3 allied slots. A Zone card creates one new connected hex.')

def card_box(c):
    accent=colors.HexColor(ACC.get(c['element'],'#867047'));stats=f"{c['kind'].upper()}  |  Cost {c['cost']} Essence"
    if c['kind']=='unit':stats+=f"  |  ATK {c.get('attack','-')}  |  HP {c.get('health','-')}"
    attr=c.get('attribute') or {'flame':'fire','tide':'water','undead':'death','storm':'lightning','neutral':'earth'}.get(c['element'],'earth')
    title=Table([[Paragraph(c['name'],styles['CardName']),Paragraph(attr.upper(),ParagraphStyle('attr',parent=styles['SmallX'],alignment=2,textColor=colors.white,fontName='Helvetica-Bold'))]],colWidths=[2.65*inch,.65*inch]);title.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),accent),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    body=[Paragraph(stats,styles['SmallX']),Spacer(1,3),Paragraph(c['text'].replace('•','-'),styles['CardText'])]
    if c.get('flavor'):body += [Spacer(1,3),Paragraph('<i>'+c['flavor']+'</i>',styles['SmallX'])]
    content=Table([[title],[body]],colWidths=[3.3*inch]);content.setStyle(TableStyle([('BOX',(0,0),(-1,-1),.8,accent),('BACKGROUND',(0,1),(-1,-1),PAPER),('LEFTPADDING',(0,1),(-1,-1),7),('RIGHTPADDING',(0,1),(-1,-1),7),('TOPPADDING',(0,1),(-1,-1),6),('BOTTOMPADDING',(0,1),(-1,-1),7)]));return content

guide=[];cover(guide,'Heroics Card Codex & Field Guide','All current cards, Leader forms, core mechanics, and a practical hex-field walkthrough.','CLASH OF LEADERS')
section(guide,'Quick Rules Reference','This document reflects the implemented beta update. “Tile,” “hex,” and “Zone tile” refer to one of the three battlefield hexes.')
quick=[['Deck','Exactly 40 cards; maximum 3 copies of a card.'],['Turn','Deploy Phase, then Battle Phase. Magic may be cast during either phase.'],['Evolution','Activate at will when eligible, once per turn.'],['Combat','No counterattacks. Attackers deal damage; defenders do not automatically strike back.'],['Field size','Start with 3 connected hexes. Each Zone card adds 1 new hex, up to 7 total.'],['Capacity','Every hex holds up to 3 units per team.'],['Movement','Move only across connected hexes. A contested hex blocks departure unless the unit has Sneak.'],['Leader damage','A unit must occupy the enemy Gate hex before it can attack the enemy Leader.'],['Resources','Essence pays for cards. Ability Points pay for Leader abilities and refresh each turn.']]
t=Table([[Paragraph(f'<b>{a}</b>',styles['BodyX']),Paragraph(b,styles['BodyX'])] for a,b in quick],colWidths=[1.25*inch,5.65*inch]);t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.4,colors.HexColor('#D8D1C5')),('BACKGROUND',(0,0),(0,-1),colors.HexColor('#F0E3C3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));guide += [t,PageBreak()]

section(guide,'Leader Evolution Lines','Health, Attack, and AP below are total stats for that form, not cumulative bonuses.')
for faction,forms in data['evolutions'].items():
    guide.append(Paragraph({'flame':'Ignis','tide':'Shellgon','undead':'Queen of the Dead','storm':'Tempestfang'}[faction],styles['H2X']))
    rows=[['Form / Level','HP','ATK','AP','Ability and rules']]
    for f in forms:rows.append([Paragraph(f"<b>{f['title']}</b><br/><font size=7>{f['form']} - Level {f['level']}</font>",styles['SmallX']),str(f['maxHealth']),str(f['attack']),str(f['abilityPoints']),Paragraph(f"<b>{f['ability']}</b><br/>{f['passive']}",styles['SmallX'])])
    table=Table(rows,colWidths=[1.7*inch,.42*inch,.42*inch,.42*inch,3.9*inch],repeatRows=1);table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor(ACC[faction])),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#CEC7BB')),('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,1),(-1,-1),PAPER),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));guide += [table,Spacer(1,10)]
    if faction=='tide':guide.append(PageBreak())

guide.append(PageBreak());section(guide,'Complete Card List','Card attributes use the six-attribute system: Fire, Water, Lightning, Death, Earth, and Divine.')
groups=[('flame','Fire Deck'),('tide','Water Deck'),('undead','Queen of the Dead Deck'),('storm','Tempestfang Deck'),('neutral','Zone Cards')]
for key,label in groups:
    cards=[c for c in data['cards'] if c['element']==key]
    guide += [Paragraph(label,styles['H2X']),Paragraph(f'{len(cards)} unique cards',styles['SmallX']),Spacer(1,5)]
    for i in range(0,len(cards),2):
        cells=[card_box(c) for c in cards[i:i+2]]
        if len(cells)==1:cells.append('')
        row=Table([cells],colWidths=[3.42*inch,3.42*inch],hAlign='LEFT');row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),7)]));guide.append(KeepTogether(row))
    guide.append(PageBreak())

section(guide,'Expandable Hex Field Walkthrough','The map starts with three connected hexes and may grow to seven. Every hex contains three enemy slots and three allied slots.')
guide += [FieldDiagram(),Spacer(1,8)]
walk=[('1. Start with three','Every match opens with Home Gate, Center Zone, and Enemy Gate connected in a straight row.'),('2. Prepare a Zone','During Deploy, inspect a Zone card and press Choose Hex Placement. No Essence is spent until placement is confirmed.'),('3. Choose a connection','Open neighboring hex positions glow red. The first Zone starts from your Home Gate; later Zones may branch from a selected connected tile.'),('4. Grow to seven','Confirming creates a separate traversable Zone hex and spends the card cost. Each Zone adds exactly one tile. The shared field stops growing at seven.'),('5. Move the same turn','Enter Battle, select a unit, choose a connected destination hex, and press Move. A unit may enter the newly played Zone immediately.'),('6. Resolve contesting','If enemy units share a hex, it is contested. Units cannot leave until those enemies are cleared, except units with Sneak.'),('7. Attack normally','Press Attack, choose a legal enemy in the same hex, then confirm. Canceling preserves the rest of the turn. Damage is one-way.'),('8. Reach the Leader','A unit can attack the enemy Leader only from the original Enemy Gate hex, even when side Zones create alternate paths.'),('9. Inspect and review','Click a Zone hex for its image and rules. Open Battle Chronicle for costs, movement, damage, healing, and defeated units.')]
for n,(a,b) in enumerate(walk,1):
    if n==6:
        guide += [PageBreak(),Paragraph('Movement, Combat & Inspection',styles['H1X']),Paragraph('After the map grows, these rules control how Units travel through and fight across the connected graph.',styles['SubX'])]
    block=Table([[Paragraph(str(n),ParagraphStyle('num',parent=styles['H2X'],alignment=TA_CENTER,textColor=colors.white)),Paragraph(f'<b>{a}</b><br/>{b}',styles['BodyX'])]],colWidths=[.48*inch,6.35*inch]);block.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),GOLD),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#D6CFC3')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(1,0),(1,0),10),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));guide += [block,Spacer(1,7)]
guide += [Paragraph('Connection Rules Checklist',styles['H2X']),Paragraph('• A destination must share a hex edge with the current tile.<br/>• Every tile has three allied and three enemy Unit slots.<br/>• Zone cards create new tiles; they do not replace an existing Zone tile.<br/>• The seven-tile maximum is shared by both players.<br/>• Side paths never change which original Gate permits attacks on the Leader.',styles['BodyX'])]
guide += [Spacer(1,6),Paragraph('<b>Clarification used in this beta:</b> At Shellgon level 20, Crushing Waves is the evolved name for Whirlpool. World Tide Collapse costs 5 AP because the supplied design did not specify a cost.',styles['SmallX'])]

guide_path=os.path.join(OUT,'Heroics_Card_Codex_and_Field_Guide.pdf');doc(guide_path,'Heroics Card Codex and Field Guide').build(guide,onFirstPage=footer,onLaterPages=footer)

update=[];cover(update,'Heroics Beta Update Sheet','A simple, detailed record of what changed in this build.','UPDATE SUMMARY')
section(update,'What Changed')
changes=[('Turn phases','The old four-stop turn was replaced with Deploy and Battle. Deploy handles units, Equipment, and Zone cards. Battle handles movement, attacks, and activated abilities. Magic works in either phase.'),('Evolution','Evolution is no longer its own phase. If the requirement is met, the player may evolve at will once during that turn.'),('Combat','Counterattacks were removed. Selecting a unit and pressing Attack opens targeting. The player may confirm or cancel and continue the turn.'),('Deck size','Decks and online deck validation now require exactly 40 cards. The three-copy limit remains.'),('Expandable hex field','The battle starts with Home Gate, Center Zone, and Enemy Gate. Each Zone card creates a new connected hex with three Unit slots per team. Valid connection positions are highlighted and the shared map stops at seven tiles.'),('Graph movement','Units choose a connected destination rather than moving along fixed numbers. They may enter a new Zone that turn. Contested tiles stop departure; Sneak bypasses this restriction. Leader attacks still require the original Enemy Gate.'),('Zone inspection','Clicking a Zone hex opens its artwork, rules, controller, and field coordinates.'),('Leader resources','Ability Points were added as a separate resource. Essence pays for cards; AP pays for Leader abilities and refreshes to the current form maximum each turn.'),('Tutorial','A seven-step How to Play tutorial was added to the title screen.'),('Battle Chronicle','The small side report was replaced with a click-open match history. It records costs, remaining Essence/AP, damage sources, targets, summons, movement, healing, and defeated units.'),('Online play','The room server, hidden information, reconnects, surrender, and rematches now synchronize the new 40-card, two-phase, expandable-hex actions.')]
for title,text in changes:update += [KeepTogether([Paragraph(title,styles['H2X']),Paragraph(text,styles['BodyX'])])]
update.append(PageBreak());section(update,'Leader Updates')
for name,summary in [('Ignis','30/3/2 AP at base; 36/4/3 AP at level 10; 43/7/8 AP at level 15; 52/12/12 AP at level 20. Added Solar Slash, Solar Awakening, Solar Domain, and Supernova Judgment using AP.'),('Shellgon','30/3/2 AP at base; 36/3/3 AP at level 10; 48/5/6 AP at level 15; 60/8/10 AP at level 20. Added Healing Waters, Whirlpool/Crushing Waves, High Tide, and World Tide Collapse using AP.'),('Queen and Tempestfang','Their existing abilities now also use Ability Points so the resource rule applies consistently to every Leader.')]:update += [Paragraph(name,styles['H2X']),Paragraph(summary,styles['BodyX'])]
section(update,'Fire and Water Card Changes')
for text in ['Pearl Scout searches Mending Tide when summoned.','Coral Defender is now 2 ATK / 10 HP and redirects attacks with Block.','Riptide Hunter attacks twice in an Ocean Zone; Abyssal Crab gains +3 ATK there.','Coral Plate gives a target unit +5 HP. Mending Tide restores 5 HP to a unit or Leader. Deep Wisdom searches two Water Magic cards.','Ember Squire searches Equipment. Fire Raptor searches another Fire Raptor.','Rallying Flame buffs damaged units by +2 ATK, or all units by +5 ATK while Solar Champion is in play.','Solar Champion searches Rallying Flame. Phoenix Call searches one Fire card.']:update.append(Paragraph('• '+text,styles['BodyX']))
update.append(PageBreak());section(update,'Validation Results')
validation=[['Check','Result'],['Updated rule assertions','PASS'],['Automated matches','200'],['Stalled matches','0'],['Average simulated match','4.1 turns'],['Online room and hidden-hand test','PASS'],['Reconnect, surrender, rematch','PASS'],['TypeScript and production build','PASS']]
vt=Table(validation,colWidths=[4.7*inch,2*inch]);vt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),DARK),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.5,colors.HexColor('#CFC7BB')),('BACKGROUND',(0,1),(-1,-1),PAPER),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));update += [vt,Spacer(1,15),Paragraph('<b>Balance note:</b> The new Leader values are implemented as supplied. This validation checked correctness, completion, stalls, and synchronization; it did not silently rebalance the user-provided numbers.',styles['BodyX']),Paragraph('<b>Implementation clarification:</b> World Tide Collapse uses 5 AP, and Crushing Waves is treated as Whirlpool’s level-20 name. These can be changed easily if a different cost or separate ability is desired.',styles['BodyX'])]
update_path=os.path.join(OUT,'Heroics_Beta_Update_Sheet.pdf');doc(update_path,'Heroics Beta Update Sheet').build(update,onFirstPage=footer,onLaterPages=footer)
print(guide_path);print(update_path)
