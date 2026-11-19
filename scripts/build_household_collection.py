"""Original stylized bedroom and tables, generated in Blender. See source manifest."""
import bpy, json, math, re, textwrap
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
# Reuse the tested modeling primitives, without running the seating build loop.
shared=(ROOT/'scripts'/'build_seating_collection.py').read_text().split('manifest=[]')[0]
exec(compile(shared.replace('HD Seating','HD Household'),'modeling_primitives','exec'))
all_names=json.loads((SOURCE/'requested-items.json').read_text())
M['glass']=material('glass',(.7,.85,.88),.08)
M['ceramic']=material('ceramic',(.86,.84,.76),.25)
M['bedding']=material('bedding',(.72,.53,.36))
def cabinet(w=1.2,d=.5,h=.9,drawers=3,doors=False):
    feet(w,d,.12)
    box((0,0,h/2+.06),(w,d,h-.12),'legs',.018)
    box((0,0,h+.015),(w+.035,d+.035,.045),'legs',.014)
    if doors:
        for side in [-1,1]:
            x=side*w*.245;box((x,-d/2-.012,h*.52),(w*.48,.025,h*.82),'legs',.008)
            for z in [h*.23,h*.79]:box((x,-d/2-.03,z),(w*.39,.018,h*.25),'legs',.009)
            rod((side*.065,-d/2-.05,h*.5),(side*.065,-d/2-.05,h*.62),.009,'metal')
    else:
        dh=(h-.2)/drawers
        for i in range(drawers):
            z=.16+dh*(i+.5);box((0,-d/2-.015,z),(w-.05,.028,dh-.022),'legs',.008)
            rod((-.08,-d/2-.055,z),(.08,-d/2-.055,z),.008,'metal')
def bed(name):
    w=.95 if name in ['Single bed',"Children's bed",'Bunk bed','Loft bed'] else 1.4 if name=='Double bed' else 1.8 if name=='King bed' else 1.6
    d=2.05
    if name in ['Toddler bed','Crib','Bassinet']:w=.7;d=1.35 if name!='Bassinet' else .9
    frame='fabric' if name=='Upholstered bed' else 'legs'
    z=1.55 if name=='Loft bed' else .32
    if name=='Headboard':
        box((0,0,.65),(1.65,.09,1.3),'fabric',.05)
        for x in [-.6,-.3,0,.3,.6]:rod((x,-.055,.15),(x,-.055,1.15),.008,'accent')
        return
    feet(w,d,z)
    box((0,0,z),(w,d,.18),frame,.025)
    if name!='Bed frame':
        box((0,0,z+.2),(w-.06,d-.06,.22),'ceramic',.07)
        box((0,-.3,z+.34),(w-.04,d*.66,.12),'bedding',.06)
        for x in ([-w*.25,w*.25] if w>1.1 else [0]):box((x,.7,z+.37),(w*.39 if w>1.1 else w*.8,.42,.16),'fabric',.07,(.08,0,0))
        for x in [-w*.42,w*.42]:curve([(x,y,z+.405)for y in [-.91,-.5,0,.35]],.004,'seams')
    head_h=.9 if name!='Platform bed' else .55
    box((0,d/2-.025,z+head_h/2),(w+.05,.09,head_h),frame,.04)
    if name in ['Upholstered bed','Queen bed','King bed']:
        for x in [-.55,-.28,0,.28,.55]:
            if abs(x)<w/2-.08:box((x,d/2-.08,z+.62),(.22,.06,.5),'fabric',.035)
    if name in ['Four-poster bed','Canopy bed']:
        for x in [-1,1]:
            for y in [-1,1]:
                rod((x*w/2,y*d/2,0),(x*w/2,y*d/2,2.2),.035,'legs')
        for y in [-1,1]:rod((-w/2,y*d/2,2.2),(w/2,y*d/2,2.2),.025)
        for x in [-1,1]:rod((x*w/2,-d/2,2.2),(x*w/2,d/2,2.2),.025)
        if name=='Canopy bed':
            for x in [-1,1]:
                for y in [-1,1]:
                    for i in range(5):rod((x*w/2+(i-2)*.025,y*d/2,.4),(x*w/2+(i-2)*.025,y*d/2,2.18),.027,'fabric')
    if name in ['Bunk bed','Loft bed']:
        top=1.55
        if name=='Bunk bed':
            box((0,0,top),(w,d,.16),'legs',.02);box((0,0,top+.16),(w-.05,d-.05,.18),'bedding',.05)
        for x in [-1,1]:
            for y in [-1,1]:rod((x*w/2,y*d/2,0),(x*w/2,y*d/2,2.02),.03)
        for x in [-1,1]:rod((x*w/2,-d/2,1.95),(x*w/2,d/2,1.95),.022)
        for x in [-.2,.2]:rod((x,-d/2-.3,0),(x,-d/2-.05,1.9),.025)
        for level in range(1,7):rod((-.2,-d/2-.3+level*.04,level*.28),(.2,-d/2-.3+level*.04,level*.28),.02)
        if name=='Loft bed':box((0,.2,.72),(w-.12,1,.055),'legs',.015)
    if name in ['Toddler bed',"Children's bed"]:
        for x in [-w/2,w/2]:rod((x,-.4,.6),(x,.8,.6),.025,'accent')
    if name in ['Crib','Bassinet']:
        for side in [-1,1]:
            for i in range(12):
                y=-d/2+i*d/11;rod((side*w/2,y,.3),(side*w/2,y,1.05),.013)
            rod((side*w/2,-d/2,1.05),(side*w/2,d/2,1.05),.024)
        if name=='Bassinet':
            for side in [-1,1]:curve([(side*w*.45,y,.02+.3*y*y)for y in [-.65,-.4,0,.4,.65]],.025)
    if name=='Murphy bed':
        for x in [-1,1]:box((x*(w/2+.06),.5,1.1),(.1,1.1,2.2),'legs',.018)
        box((0,1.03,1.1),(w+.2,.08,2.2),'legs',.018);box((0,.5,2.18),(w+.2,1.1,.08),'legs',.015)
def table(w=1.4,d=.8,h=.75,round_top=False,pedestal=False):
    if round_top:
        rod((0,0,h-.055),(0,0,h),w/2,'legs')
    else:
        # Blender uses Z for height, so the tabletop thickness belongs on Z.
        box((0,0,h-.03),(w,d,.06),'legs',.016)
    if pedestal:
        rod((0,0,.05),(0,0,h-.07),.075,'metal',.055)
        rod((0,0,.015),(0,0,.055),w*.3,'metal')
    else:
        feet(w,d,h-.06)
        for y in [-1,1]:box((0,y*(d/2-.09),h-.12),(w-.1,.045,.13),'legs',.007)
def shelves(w=1,d=.35,h=1.6,levels=4):
    for x in [-1,1]:box((x*(w/2-.025),0,h/2),(.05,d,h),'legs',.008)
    for i in range(levels+1):box((0,0,.05+i*(h-.1)/levels),(w,.05 if False else d,.045),'legs',.008)
def bedroom(name):
    if name in all_names[27:44]:return bed(name)
    if name in ['Bedside table','Nightstand']:cabinet(.5,.45,.55,1 if name=='Bedside table' else 2)
    elif name in ['Dresser','Chest of drawers']:cabinet(1.4 if name=='Dresser' else .7,.48,.85 if name=='Dresser' else 1.3,3 if name=='Dresser' else 5)
    elif name in ['Wardrobe','Armoire']:
        cabinet(1.4 if name=='Wardrobe' else 1.05,.58,2.05,doors=True)
        if name=='Armoire':box((0,0,2.13),(1.2,.66,.1),'legs',.03)
    elif name=='Vanity table':
        table(1.1,.5,.75);cabinet(.32,.46,.65,3);box((0,.22,1.2),(.62,.07,.8),'legs',.03);box((0,.175,1.2),(.54,.015,.71),'glass',.025)
    elif name in ['Dressing stool','Bedroom bench']:
        w=.5 if name=='Dressing stool' else 1.2;feet(w,.45,.38);cushion(0,0,.45,w,.45,.15)
    elif name=='Clothes rack':
        for x in [-.55,.55]:
            rod((x,-.25,.025),(x,.25,.025),.025,'metal');rod((x,0,.025),(x,0,1.65),.025,'metal')
        rod((-.55,0,1.65),(.55,0,1.65),.025,'metal')
        for x in [-.3,-.1,.1,.3]:curve([(x-.1,0,1.45),(x,0,1.57),(x+.1,0,1.45),(x-.1,0,1.45)],.008,'legs')
    elif name=='Laundry hamper':
        box((0,0,.35),(.48,.4,.7),'accent',.035)
        for z in [.08,.16,.24,.32,.4,.48,.56,.64]:curve([(-.245,-.205,z),(.245,-.205,z),(.245,.205,z),(-.245,.205,z)],.005,'legs',True)
        box((0,0,.71),(.5,.42,.035),'legs',.015)
    elif name=='Changing table':
        shelves(.95,.55,.9,2);cushion(0,0,.95,.85,.48,.08)
        for x in [-.45,.45]:box((x,0,1.02),(.05,.54,.14),'legs',.01)
    elif name=='Toy chest':
        cabinet(.85,.5,.5,1);box((0,0,.55),(.9,.54,.075),'accent',.02)
        for x in [-.32,.32]:sphere((x,-.27,.25),(.025,.01,.025),'metal')
def tables(name):
    if name=='Nesting tables':
        for i in range(3):
            start=len(objects);table(.65-i*.1,.5-i*.06,.55-i*.12)
            for obj in objects[start:]:obj.location.x+=i*.35
        return
    if name in ['Serving trolley']:
        for z in [.18,.7]:box((0,0,z),(.75,.45,.04),'legs',.012)
        for x in [-.34,.34]:
            for y in [-.19,.19]:rod((x,y,.08),(x,y,.85),.016,'metal');sphere((x,y,.055),(.04,.025,.04),'metal')
        rod((-.34,.19,.85),(.34,.19,.85),.015,'metal');return
    if name=='Bedside tray':
        box((0,0,.25),(.6,.35,.035),'legs',.01)
        for y in [-.17,.17]:box((0,y,.29),(.6,.02,.06),'legs',.006)
        for x in [-.25,.25]:rod((x,-.13,0),(x,-.13,.24),.015);rod((x,.13,0),(x,.13,.24),.015)
        return
    low=name in ['Coffee table','Side table','End table','Accent table'];bar=name in ['Breakfast bar','Bar counter'];desk='desk' in name.lower() or name in ['Craft table','Workbench']
    w=.6 if name in ['Side table','End table','Accent table'] else 1.1 if low else 1.6 if desk else 1.8
    d=.5 if low else .55 if name in ['Console table','Breakfast bar','Bar counter'] else .8
    h=.42 if name=='Coffee table' else .55 if low else 1.05 if bar or name=='Standing desk' else .75
    round_top=name in ['Round dining table','Pedestal table','Accent table'];pedestal=name in ['Round dining table','Pedestal table']
    if name=='Kitchen island':
        cabinet(1.6,.8,.87,doors=True);box((0,0,.92),(1.75,.95,.065),'ceramic',.02);return
    table(w,d,h,round_top,pedestal)
    if name=='Extendable dining table':
        for x in [-.3,.3]:curve([(x,-d/2,h+.002),(x,d/2,h+.002)],.002,'metal')
    if name in ['Computer desk','Writing desk','Desk']:
        start=len(objects);cabinet(.35,.6,.65,3)
        for obj in objects[start:]:obj.location.x-=w/2-.2
        if name=='Computer desk':box((.3,.2,h+.12),(.55,.2,.025),'metal',.01)
    if name=='Standing desk':
        for x in [-.55,.55]:box((x,0,.5),(.08,.08,.9),'metal',.01);box((x,0,.035),(.1,.65,.05),'metal',.01)
    if name=='Workbench':
        for x in [-.6,-.2,.2,.6]:rod((x,-.25,.15),(x,-.25,.67),.025)
        box((0,0,.2),(1.4,.65,.06),'legs',.015)
    if name in ['Picnic table','Outdoor dining table']:
        for y in [-.65,.65]:box((0,y,.43),(w,.25,.06),'legs',.012)
        for x in [-w*.35,w*.35]:rod((x,-.75,0),(x,.3,h-.1),.035);rod((x,.75,0),(x,-.3,h-.1),.035)
    if name=='Bar counter':box((0,.22,.55),(w,.06,1.05),'legs',.01)
    if name=='Console table':box((0,0,.18),(w-.12,d-.08,.04),'legs',.01)

manifest=[]
# Reuse export/thumbnail steps from the tested seating pipeline.
seating=(ROOT/'scripts'/'build_seating_collection.py').read_text()
export_block=textwrap.dedent(seating.split('    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.')[1].split("(SOURCE/'seating-manifest.json')")[0])
export_block=export_block.replace("'category':'Seating'","'category':category")
export_block=export_block.replace("{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric'}","{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric','bedding':'fabric','ceramic':'ceramic'}")
for index,name in enumerate(all_names[27:83]):
    objects=[];category='Bedroom' if index<30 else 'Tables';slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
    if index<30:bedroom(name)
    else:tables(name)
    exec(compile(export_block,'asset_export','exec'))
(SOURCE/'household-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'HouseholdCatalog.js').write_text('// Generated original Blender models.\nexport const HOUSEHOLD_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'household-collection.blend'))
thumbnail_block=seating.split("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'")[1].split("print('SEATING COLLECTION COMPLETE")[0]
thumbnail_block=thumbnail_block.replace('resolution_x=320','resolution_x=192').replace('resolution_y=320','resolution_y=192')
exec(compile("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'"+thumbnail_block,'thumbnails','exec'))
print('HOUSEHOLD COMPLETE: '+str(len(manifest)))
