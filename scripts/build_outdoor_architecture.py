"""Outdoor, architectural, hobby, pet and structural originals: entries 380–479."""
import bpy,json,math,re,textwrap
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
shared=(ROOT/'scripts'/'build_equipment_collection.py').read_text().rsplit('\nmanifest=[]',1)[0].replace("'HD Equipment'","'HD Outdoors'")
exec(compile(shared,'equipment_primitives','exec'))
def shift_from(start,x=0,y=0,z=0):
    for obj in objects[start:]:obj.location+=Vector((x,y,z))
def outdoor(name):
    if name in ['Outdoor sofa','Patio armchair','Outdoor chair','Sun lounger','Deck chair']:
        if name=='Outdoor sofa':sofa(2.1,modular=True)
        elif name in ['Sun lounger','Deck chair']:
            for y in [-.8,-.65,-.5,-.35,-.2,-.05,.1,.25,.4,.55,.7,.85]:box((0,y,.35),(.7,.1,.04),'legs',.008)
            feet(.7,1.8,.32);box((0,.7,.65),(.7,.6,.045),'legs',.012,(.8,0,0))
        else:chair('Accent chair' if name=='Patio armchair' else 'Dining chair')
        return
    if name in ['Hammock','Hanging swing','Porch swing']:
        for x in [-1.1,1.1]:
            rod((x,-.4,0),(x,0,1.8),.035);rod((x,.4,0),(x,0,1.8),.035)
        rod((-1.1,0,1.8),(1.1,0,1.8),.035)
        if name=='Hammock':
            for i in range(15):y=-.35+i*.05;curve([(-1.05,y,1.5),(-.65,y,.65),(0,y,.5),(.65,y,.65),(1.05,y,1.5)],.016,'fabric')
        else:
            box((0,0,.5),(1.5,.6,.08),'legs',.012);box((0,.25,.8),(1.5,.08,.55),'legs',.012)
            for x in [-.7,.7]:rod((x,0,.55),(x,0,1.8),.008,'metal')
        return
    if name in ['Patio umbrella','Gazebo','Pergola']:
        if name=='Patio umbrella':
            rod((0,0,0),(0,0,2.2),.025,'metal');cone((0,0,2.1),1.1,.05,.35,'fabric')
            for i in range(8):a=i*math.tau/8;rod((0,0,2.25),(math.cos(a)*1.05,math.sin(a)*1.05,1.95),.008,'metal')
        else:
            for x in [-1.2,1.2]:
                for y in [-1.2,1.2]:box((x,y,1.15),(.12,.12,2.3),'legs',.015)
            for y in [-1.2,1.2]:box((0,y,2.25),(2.65,.14,.17),'legs',.015)
            for x in [-1.3,-1,-.7,-.4,-.1,.2,.5,.8,1.1,1.3]:box((x,0,2.38),(.1,2.7,.13),'legs',.01)
            if name=='Gazebo':cone((0,0,2.5),1.9,.1,.4,'fabric')
        return
    if name in ['Outdoor bar','Outdoor kitchen counter']:cabinet(1.8,.6,1.05,doors=True);return
    if name=='Barbecue grill':
        box((0,0,.85),(.85,.5,.25),'metal',.06);sphere((0,0,1),(.43,.25,.22),'steel');rod((-.3,-.3,1),(.3,-.3,1),.012,'metal')
        feet(.75,.45,.75)
        for x in [-.28,0,.28]:sphere((x,-.27,.8),(.025,.012,.025),'steel')
        return
    if name in ['Fire pit','Outdoor fireplace']:fireplace('Modern fireplace' if name=='Outdoor fireplace' else 'Fire pit');return
    if name in ['Garden planter','Flower pot','Raised garden bed']:
        if name=='Raised garden bed':
            box((0,0,.25),(1.6,.8,.5),'legs',.02);box((0,0,.51),(1.5,.7,.025),'soil',.005)
            for x in [-.5,0,.5]:start=len(objects);plant('Small potted plant');shift_from(start,x=x,z=.45)
        else:plant('Outdoor planter' if name=='Garden planter' else 'Medium potted plant')
        return
    if name=='Garden trellis':
        for x in [-.5,.5]:rod((x,0,0),(x,0,1.8),.025)
        for i in range(8):
            z=.1+i*.2;rod((-.5,0,z),(.5,0,z+.2),.009);rod((-.5,0,z+.2),(.5,0,z),.009)
        return
    if name in ['Outdoor lantern','Pathway light']:light('Lantern' if name=='Outdoor lantern' else 'Garden path light');return
    if name in ['Fountain','Birdbath']:
        cone((0,0,.4),.22,.1,.8,'ceramic');start=len(objects);bowl(.5,.16);shift_from(start,z=.8)
        if name=='Fountain':start=len(objects);bowl(.24,.1);shift_from(start,z=1.2);rod((0,0,.85),(0,0,1.3),.045,'ceramic')
        return
    if name=='Outdoor sculpture':decor('Abstract statue');return
    if name=='Hot tub':
        box((0,0,.4),(1.8,1.8,.8),'legs',.08);box((0,0,.82),(1.65,1.65,.03),'artBlue',.06)
        for x in [-.8,.8]:box((x,0,.83),(.12,1.8,.08),'ceramic',.025)
        for y in [-.8,.8]:box((0,y,.83),(1.8,.12,.08),'ceramic',.025)
        return
    if name=='Poolside table':table(.55,.55,.45,True,True)
def fireplace(name):
    if name=='Firewood holder':
        for x in [-.35,.35]:rod((x,-.2,.03),(x,-.2,.7),.012,'metal')
        for i in range(7):rod((-.25+(i%3)*.22,-.2,.1+(i//3)*.15),(-.25+(i%3)*.22,.2,.1+(i//3)*.15),.075,'legs')
        return
    if name=='Decorative fireplace screen':
        for x in [-.5,.5]:rod((x,0,0),(x,0,.7),.015,'metal')
        for z in [0,.7]:rod((-.5,0,z),(.5,0,z),.015,'metal')
        for x in [-.4,-.3,-.2,-.1,0,.1,.2,.3,.4]:rod((x,0,0),(x,0,.7),.003,'metal')
        return
    if name=='Fire pit':
        start=len(objects);bowl(.5,.22,'steel')
        for i in range(6):a=i*math.tau/6;cone((math.cos(a)*.2,math.sin(a)*.2,.3),.08,.005,.25,'bulb')
        return
    if name in ['Decorative column','Column']:column();return
    if name in ['Wall molding','Wainscoting','Wall panel','Decorative beam','Ceiling decoration','Ceiling medallion','Decorative arch','Wall niche']:
        structure(name);return
    if name in ['Room divider','Folding screen','Decorative partition']:
        for i in range(3):
            x=(i-1)*.55;box((x,0,.9),(.53,.06,1.8),'legs',.015)
            for z in [.3,.6,.9,1.2,1.5]:box((x,-.04,z),(.4,.018,.22),'fabric',.008)
        return
    w=1.3;h=1.2
    box((0,.15,.55),(w,.12,1.1),'ceramic',.015)
    box((0,0,.5),(.92,.22,.72),'metal',.01)
    if name in ['Traditional fireplace','Fireplace mantel','Fireplace surround']:
        for x in [-.58,.58]:box((x,-.06,.55),(.2,.24,1.1),'ceramic',.015)
        box((0,-.03,1.14),(1.45,.35,.12),'legs',.02)
    if name!='Fireplace mantel':
        for x in [-.24,0,.24]:rod((x,-.13,.22),(x+.05,.04,.22),.05,'legs');cone((x,-.05,.4),.07,.002,.3,'bulb')
def hobbies(name):
    if name in ['Piano','Keyboard instrument']:
        w=1.4;box((0,0,.85),(w,.45,.16),'metal' if name=='Keyboard instrument' else 'legs',.025)
        for i in range(36):
            x=-.65+i*.037;box((x,-.17,.95),(.033,.28,.02),'ceramic',.002)
            if i%7 not in [2,6]:box((x+.016,-.07,.975),(.018,.13,.025),'metal',.002)
        if name=='Piano':box((0,.18,1.15),(w,.15,.55),'legs',.025);box((0,0,.13),(w,.4,.12),'legs',.015)
        feet(w,.4,.75);return
    if name in ['Guitar','Violin']:
        s=.6 if name=='Violin' else 1
        sphere((0,0,.3*s),(.22*s,.065*s,.28*s),'legs');sphere((0,0,.55*s),(.17*s,.06*s,.18*s),'legs')
        box((0,0,.93*s),(.07*s,.06*s,.7*s),'legs',.012)
        ring((0,-.067,.45*s),.075*s,'metal',.008,'y')
        for i in range(6):rod(((i-2.5)*.008,-.07,.25*s),((i-2.5)*.008,-.04,1.3*s),.0015,'steel')
        return
    if name in ['Microphone stand','Music stand','Easel','Painting canvas']:
        for a in [0,2.1,4.2]:rod((0,0,.4),(math.cos(a)*.35,math.sin(a)*.35,.02),.015,'metal')
        rod((0,0,.05),(0,0,1.4),.018,'metal')
        if name=='Microphone stand':rod((0,0,1.4),(.35,0,1.55),.012,'metal');rod((.3,0,1.55),(.45,0,1.55),.03,'metal')
        else:box((0,0,1.1),(.65,.045,.65),'legs',.008);box((0,-.03,1.1),(.59,.015,.59),'ceramic',.003)
        return
    if name in ['Crafting table','Chess table','Game table','Foosball table','Billiards table']:
        table(1.8 if name=='Billiards table' else 1.2,.9,.8)
        if name in ['Foosball table','Billiards table']:
            box((0,0,.82),(1.7 if name=='Billiards table' else 1.1,.8,.04),'artGreen',.008)
            for y in [-.43,.43]:box((0,y,.86),(1.8 if name=='Billiards table' else 1.2,.07,.12),'legs',.012)
            if name=='Foosball table':
                for x in [-.4,-.2,0,.2,.4]:
                    rod((x,-.65,.93),(x,.65,.93),.008,'steel')
                    for y in [-.2,0,.2]:box((x,y,.88),(.035,.045,.12),'artBlue' if x<0 else 'flower',.005)
            else:
                for x in [-.8,0,.8]:
                    for y in [-.38,.38]:sphere((x,y,.86),(.06,.06,.02),'metal')
                for i in range(8):sphere((((i%3)-1)*.06,(i//3)*.06,.87),(.025,.025,.025),'artGold' if i%2 else 'flower')
        elif name=='Chess table':
            for x in range(8):
                for y in range(8):box((-.32+x*.09,-.32+y*.09,.837),(.09,.09,.004),'ceramic' if (x+y)%2 else 'metal',.001)
        return
    if name=='Treadmill':
        box((0,0,.12),(.75,1.6,.24),'metal',.04);box((0,0,.25),(.58,1.4,.025),'steel',.015)
        for x in [-.32,.32]:rod((x,.5,.2),(x,.6,1.2),.025,'metal')
        box((0,.58,1.2),(.7,.24,.06),'screen',.015);return
    if name=='Exercise bike':
        for y in [-.45,.45]:rod((-.3,y,.04),(.3,y,.04),.025,'metal')
        ring((0,.25,.35),.25,'metal',.025,'y');rod((0,-.3,.08),(0,0,.9),.035,'metal');box((0,0,.9),(.25,.3,.05),'fabric',.03);rod((0,.4,.1),(0,.4,1.1),.025,'metal');rod((-.25,.4,1.1),(.25,.4,1.1),.02,'metal');return
    if name=='Weight bench':
        table(1.2,.35,.4);box((0,0,.46),(1.2,.35,.12),'fabric',.04)
        for x in [-.5,.5]:rod((x,.25,0),(x,.25,1.1),.025,'metal')
        rod((-.75,.25,1.05),(.75,.25,1.05),.015,'steel')
        for x in [-.6,.6]:rod((x-.03,.25,1.05),(x+.03,.25,1.05),.13,'metal')
        return
    if name=='Punching bag':rod((0,0,.2),(0,0,1.3),.2,'fabric');rod((0,0,1.3),(0,0,1.8),.006,'metal');return
    if name=='Yoga mat':box((0,0,.008),(.65,1.8,.016),'fabric',.008);return
    if name=='Meditation stool':feet(.45,.35,.22);cushion(0,0,.26,.45,.35,.1);return
    if name in ['Pet bed','Pet toy basket','Pet bowl']:
        if name=='Pet bowl':bowl(.18,.08,'steel')
        elif name=='Pet bed':cushion(0,0,.1,.75,.6,.18);ring((0,0,.16),.3,'fabric',.07)
        else:decor('Woven basket')
        return
    if name in ['Cat tree','Scratching post']:
        box((0,0,.03),(.7,.6,.06),'legs',.012)
        for x in ([-.2,.2] if name=='Cat tree' else [0]):
            rod((x,0,.06),(x,0,1.1),.065,'accent')
            for z in [.15,.25,.35,.45,.55,.65,.75,.85,.95]:ring((x,0,z),.067,'fabric',.004)
        if name=='Cat tree':
            for x,z in [(-.2,.65),(.2,1.15)]:box((x,0,z),(.45,.45,.06),'fabric',.02)
        return
    if name in ['Aquarium','Terrarium enclosure']:
        box((0,0,.04),(.9,.4,.08),'metal',.01);box((0,0,.36),(.85,.36,.6),'glass',.006)
        for x in [-.43,.43]:
            for y in [-.19,.19]:rod((x,y,.04),(x,y,.67),.008,'metal')
        for i in range(5):leaf((-.3+i*.15,0,.08),(-.25+i*.15,0,.4+(i%2)*.1),.025)
        return
    if name=='Bar station':cabinet(1.5,.5,1.1,doors=True);return
    if name=='Wine display':storage('Wine rack');return
def column():
    rod((0,0,.1),(0,0,2.2),.13,'ceramic')
    for z in [.04,.12,2.15,2.23]:box((0,0,z),(.38,.38,.08),'ceramic',.012)
    for i in range(16):a=i*math.tau/16;rod((math.cos(a)*.13,math.sin(a)*.13,.2),(math.cos(a)*.13,math.sin(a)*.13,2.1),.008,'ceramic')
def structure(name):
    if name in ['Single door','Double door','Sliding door','French door','Glass door','Interior window','Picture window','Bay window','Casement window','Sliding window','Skylight','Archway']:
        door='door' in name.lower();w=1.8 if name in ['Double door','Sliding door','French door'] else 1.2;h=2.1 if door or name=='Archway' else 1.2
        for x in [-w/2,w/2]:box((x,0,h/2),(.07,.14,h),'legs',.012)
        box((0,0,h),(w+.07,.14,.07),'legs',.012)
        if name=='Archway':
            curve([(w/2*math.cos(i*math.pi/24),0,h-.35+.35*math.sin(i*math.pi/24))for i in range(25)],.055,'legs');return
        panels=2 if name in ['Double door','Sliding door','French door','Sliding window'] else 3 if name=='Bay window' else 1
        for i in range(panels):
            x=-w/2+(i+.5)*w/panels;pw=w/panels-.06
            if name in ['Single door','Double door']:
                box((x,0,h/2),(pw,.045,h-.08),'legs',.015)
                for z in [.5,1.45]:box((x,-.03,z),(pw-.14,.02,.6),'legs',.015)
            else:
                for sx in [-1,1]:box((x+sx*pw/2,0,h/2),(.04,.065,h-.06),'legs',.006)
                box((x,0,h/2),(pw,.018,h-.1),'glass',.002)
                if name=='French door':
                    for z in [.7,1.4]:box((x,-.015,z),(pw,.035,.025),'legs',.003)
            if door:rod((x+pw*.3,-.045,.95),(x+pw*.1,-.045,.95),.012,'steel')
        return
    if name=='Stairs':
        for i in range(12):box((0,-1.1+i*.2,(i+1)*.09),(1,.22,(i+1)*.18),'legs',.005)
        return
    if name in ['Stair railing','Fence','Gate']:
        h=1 if name!='Fence' else 1.2
        for i in range(11):x=-1+i*.2;rod((x,0,0),(x,0,h),.018,'metal')
        for z in [.1,h]:rod((-1,0,z),(1,0,z),.025,'metal')
        if name=='Gate':sphere((.8,-.04,.65),(.025,.025,.025),'steel')
        return
    if name in ['Column','Decorative column']:column();return
    if name in ['Half wall','Wall covering','Wainscoting','Wall panel','Ceiling finish','Floor covering']:
        if name in ['Ceiling finish','Floor covering']:box((0,0,.015),(2,2,.03),'ceramic',.004)
        else:
            h=1.1 if name in ['Half wall','Wainscoting'] else 2.2
            box((0,0,h/2),(1.5,.08,h),'ceramic',.008)
            for i in range(9):box((-.7+i*.175,-.05,h/2),(.025,.025,h-.05),'legs',.004)
        return
    if name in ['Decorative arch','Wall niche']:
        for x in [-.6,.6]:box((x,0,.85),(.12,.18,1.7),'ceramic',.012)
        curve([(.6*math.cos(i*math.pi/24),0,1.7+.6*math.sin(i*math.pi/24))for i in range(25)],.07,'ceramic')
        return
    if name in ['Ceiling medallion','Ceiling decoration']:ring((0,0,.03),.4,'ceramic',.05);ring((0,0,.03),.26,'ceramic',.03);return
    if name in ['Baseboard','Crown molding','Wall molding','Exterior trim','Decorative beam','Roof decoration']:
        for i in range(3):box((0,i*.018,.04+i*.03),(1.8,.035,.045),'legs',.006)
        return
    raise ValueError('Unimplemented structure '+name)
manifest=[]
seating=(ROOT/'scripts'/'build_seating_collection.py').read_text()
export_block=textwrap.dedent(seating.split('    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.')[1].split("(SOURCE/'seating-manifest.json')")[0]).replace("'category':'Seating'","'category':category").replace("'placementType':'floor'","'placementType':placement")
export_block=export_block.replace("{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric'}","{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric','ceramic':'ceramic','steel':'metal'}")
for index,name in enumerate(all_names[380:480]):
    objects=[];slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-');placement='floor';category='Outdoor' if index<27 else 'Architectural decor' if index<47 else 'Hobbies and pets' if index<75 else 'Building'
    if index<27:outdoor(name)
    elif index<47:fireplace(name)
    elif index<75:hobbies(name)
    else:structure(name)
    if name in ['Wall-mounted fireplace','Wall molding','Wainscoting','Wall panel','Decorative beam','Wall niche','Wall covering','Baseboard','Crown molding','Exterior trim']:placement='wall'
    elif name in ['Ceiling decoration','Ceiling medallion','Ceiling finish','Roof decoration','Skylight']:placement='ceiling'
    elif name in ['Punching bag']:placement='ceiling'
    elif name in ['Pet bowl','Keyboard instrument','Violin','Gaming controller']:placement='surface'
    if not objects:raise ValueError('No recipe for '+name)
    exec(compile(export_block,'asset_export','exec'))
(SOURCE/'outdoor-architecture-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'OutdoorArchitectureCatalog.js').write_text('// Generated original Blender models.\nexport const OUTDOOR_ARCHITECTURE_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'outdoor-architecture-collection.blend'))
thumbnail_block=seating.split("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'")[1].split("print('SEATING COLLECTION COMPLETE")[0]
exec(compile("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'"+thumbnail_block,'thumbnails','exec'))
print('OUTDOOR ARCHITECTURE COMPLETE: '+str(len(manifest)))
