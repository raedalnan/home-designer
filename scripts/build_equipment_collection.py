"""Kitchen, bath, office, electronics and nursery originals: entries 261–379."""
import bpy,json,math,re,textwrap
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
shared=(ROOT/'scripts'/'build_lighting_nature.py').read_text().rsplit('\nmanifest=[]',1)[0].replace("'HD Nature'","'HD Equipment'")
exec(compile(shared,'nature_primitives','exec'))
M['screen']=material('screen',(.035,.09,.13),.18);M['steel']=material('steel',(.45,.5,.55),.25,.7)
def bowl(r=.2,h=.1,part='ceramic'):
    vertices=[];faces=[];profile=[(0,0),(r*.55,.005),(r*.9,h*.6),(r,h),(r*.92,h),(r*.82,h*.6),(r*.48,.02),(0,.02)]
    for radius,z in profile:
        for i in range(32):a=i*math.tau/32;vertices.append((radius*math.cos(a),radius*math.sin(a),z))
    for row in range(len(profile)-1):
        for i in range(32):a=row*32+i;b=row*32+(i+1)%32;faces.append((a,b,b+32,a+32))
    data=bpy.data.meshes.new('Basin');data.from_pydata(vertices,[],faces);data.update();obj=bpy.data.objects.new(part,data);collection.objects.link(obj);data.materials.append(M[part]);objects.append(obj)
    for face in data.polygons:face.use_smooth=True
    return obj
def faucet(z=.25):
    curve([(0,.1,0),(0,.1,z*.8),(0,.07,z),(0,-.08,z),(0,-.1,z*.85)],.015,'steel')
    for x in [-.09,.09]:rod((x,.1,0),(x,.1,.06),.018,'steel');rod((x-.025,.1,.06),(x+.025,.1,.06),.008,'steel')
def sink(name):
    start=len(objects);bowl(.24,.13)
    for obj in objects[start:]:obj.scale.y=.7;obj.location.z=.78
    start=len(objects);faucet(.3)
    for obj in objects[start:]:obj.location.z+=.82
    if name=='Pedestal sink':cone((0,0,.4),.12,.08,.8,'ceramic')
    elif name in ['Vanity sink','Bathroom vanity','Double vanity']:cabinet(1.2 if name=='Double vanity' else .65,.45,.78,doors=True)
    if name=='Double vanity':
        # Paired basins with their own taps on one broad cabinet.
        for obj in objects[:start]:obj.location.x-=.3
        start=len(objects);bowl(.22,.12);faucet(.28)
        for obj in objects[start:]:obj.location.x+=.3;obj.location.z+=.8
def appliance(name):
    if name in ['Base kitchen cabinet','Wall kitchen cabinet','Tall kitchen cabinet','Corner cabinet','Kitchen countertop']:
        if name=='Kitchen countertop':box((0,0,.035),(1.2,.65,.07),'ceramic',.015)
        else:
            cabinet(.9 if name=='Corner cabinet' else .6,.6,2.1 if name=='Tall kitchen cabinet' else .75 if name=='Wall kitchen cabinet' else .9,doors=True)
            if name=='Corner cabinet':cabinet(.5,.8,.9,doors=True)
        return
    if name=='Kitchen sink':bowl(.25,.16,'steel');faucet(.3);return
    if name=='Kitchen faucet':faucet(.35);return
    if name in ['Refrigerator','Mini refrigerator','Freezer']:
        h=1.85 if name=='Refrigerator' else .85
        box((0,0,h/2),(.68,.66,h),'steel',.035)
        levels=[(.63,.75),(1.48,.55)] if name=='Refrigerator' else [(h/2,h-.06)]
        for z,dh in levels:
            box((0,-.34,z),(.64,.04,dh),'ceramic',.015);rod((.24,-.39,z-.15),(.24,-.39,z+.15),.012,'steel')
        return
    if name in ['Stove','Oven','Cooktop','Dishwasher','Microwave','Range hood']:
        h=.9 if name in ['Stove','Dishwasher'] else .6 if name=='Oven' else .35 if name=='Microwave' else .06
        box((0,0,h/2),(.6,.58,h),'steel',.015)
        if name in ['Stove','Oven','Microwave']:
            box((-.03,-.3,h*.45),(.46,.02,h*.62),'screen',.01);rod((-.2,-.33,h*.82),(.2,-.33,h*.82),.012,'steel')
            for i in range(4):sphere((-.18+i*.12,-.31,h*.93),(.02,.012,.02),'metal')
        if name in ['Stove','Cooktop']:
            for x in [-.16,.16]:
                for y in [-.15,.15]:ring((x,y,h+.012),.085,'metal',.008);ring((x,y,h+.012),.045,'metal',.007)
        if name=='Range hood':box((0,.12,.28),(.22,.22,.5),'steel',.01)
        if name=='Dishwasher':rod((-.2,-.31,.77),(.2,-.31,.77),.012,'steel')
        return
    if name in ['Coffee machine','Espresso machine']:
        box((0,0,.2),(.27,.28,.4),'metal',.03);box((0,-.15,.26),(.22,.035,.13),'steel',.008)
        for x in [-.05,.05]:rod((x,-.18,.28),(x,-.18,.22),.009,'steel')
        box((0,-.2,.04),(.24,.16,.025),'steel',.005);pot(.045,.07)
        return
    if name in ['Kettle','Blender','Food processor']:
        rod((0,0,0),(0,0,.05),.12,'metal');cone((0,0,.2),.11,.085,.3,'glass' if name=='Blender' else 'steel');ring((.12,0,.22),.08,'metal',.012,'y')
        rod((0,0,.35),(0,0,.38),.09,'metal')
        if name=='Kettle':curve([(-.08,0,.2),(-.17,0,.25),(-.2,0,.3)],.022,'steel')
        return
    if name=='Toaster':
        box((0,0,.12),(.26,.17,.24),'steel',.035)
        for y in [-.04,.04]:box((0,y,.242),(.18,.018,.006),'metal',.003)
        return
    if name in ['Trash bin','Recycling bin']:cone((0,0,.28),.15,.18,.56,'metal' if name=='Trash bin' else 'artGreen');rod((0,0,.57),(0,0,.59),.185,'steel');return
    if name in ['Bar cart']:tables('Serving trolley');return
    if name in ['Knife block','Cutting board']:
        box((0,0,.02),(.3,.2,.04),'legs',.015)
        if name=='Knife block':
            box((0,0,.12),(.18,.12,.2),'legs',.015)
            for i in range(5):rod((-.06+i*.03,0,.2),(-.06+i*.03,0,.35),.009,'metal')
        return
    if name in ['Dish rack','Spice rack','Pot rack']:
        shelves(.45,.22,.32,2)
        for i in range(6):rod((-.2+i*.08,-.08,.05),(-.2+i*.08,.08,.25),.005,'steel')
        return
    if name in ['Cookware set','Dishware set']:
        for i in range(3):
            start=len(objects);bowl(.08+i*.025,.07,'steel' if name=='Cookware set' else 'ceramic')
            for obj in objects[start:]:obj.location.x=(i-1)*.23
            if name=='Cookware set':rod(((i-1)*.23,.07,.06),((i-1)*.23,.25,.06),.012,'metal')
        return
    if name=='Kitchen scale':box((0,0,.03),(.2,.2,.06),'steel',.015);box((0,-.1,.04),(.08,.008,.025),'screen',.002)
def bathroom(name):
    if name in ['Toilet','Wall-hung toilet']:
        if name=='Toilet':cone((0,0,.2),.14,.12,.4,'ceramic')
        start=len(objects);bowl(.2,.15)
        for obj in objects[start:]:obj.scale.y=1.35;obj.location.z=.35
        ring((0,0,.5),.2,'ceramic',.025);box((0,.24,.65),(.37,.14,.47),'ceramic',.035);sphere((.12,.24,.9),(.025,.025,.008),'steel');return
    if name in ['Bathroom sink','Pedestal sink','Vanity sink','Double vanity']:sink(name);return
    if name in ['Bathtub','Freestanding bathtub','Corner bathtub']:
        start=len(objects);bowl(.45,.55)
        for obj in objects[start:]:obj.scale.x=1.9;obj.scale.y=1.2
        if name=='Bathtub':box((0,.5,.27),(1.7,.06,.54),'ceramic',.025)
        start=len(objects);faucet(.7)
        for obj in objects[start:]:obj.location.x=.72
        return
    if name in ['Shower enclosure','Walk-in shower','Shower screen','Shower fixture']:
        if name!='Shower fixture':
            box((0,0,.035),(.95,.95,.07),'ceramic',.015)
            box((0,.46,1),(.94,.015,1.9),'glass',.003)
            if name!='Shower screen':box((.46,0,1),(.015,.94,1.9),'glass',.003)
            for x in [-.46,.46]:rod((x,.46,.07),(x,.46,1.95),.012,'steel')
        if name!='Shower screen':
            curve([(0,.4,.7),(0,.4,1.8),(0,.1,1.8)],.015,'steel');rod((0,.1,1.75),(0,.1,1.78),.12,'steel')
        return
    if name in ['Bathroom mirror','Mirror cabinet']:artwork('Wall mirror');return
    if name in ['Towel rack','Towel rail','Towel ring','Toilet paper holder']:
        if name=='Towel ring':ring((0,0,.18),.13,'steel',.01,'y')
        else:
            for x in [-.3,.3]:rod((x,.1,.1),(x,0,.1),.012,'steel')
            rod((-.3,0,.1),(.3,0,.1),.012,'steel')
            box((0,-.015,-.05),(.38,.035,.3),'fabric',.012)
        return
    if name in ['Bathroom storage cabinet']:cabinet(.6,.35,1.5,doors=True);return
    if name=='Shower shelf':shelves(.35,.18,.6,3);return
    if name=='Bathroom stool':chair('Counter stool');return
    if name=='Laundry basket':decor('Woven basket');return
    if name=='Bathroom plant':plant('Small potted plant');return
    if name in ['Soap dispenser','Toothbrush holder','Decorative toiletries']:
        pot(.055,.15)
        if name=='Soap dispenser':rod((0,0,.15),(0,0,.21),.012,'steel');rod((0,0,.21),(.06,0,.21),.009,'steel')
        else:
            for i in range(3):rod(((i-1)*.025,0,.1),((i-1)*.025,0,.27),.006,'artBlue')
def monitor(w=.55,h=.35):
    box((0,0,.04),(w*.4,.18,.025),'metal',.008);rod((0,0,.04),(0,0,.2),.022,'metal')
    box((0,0,.2+h/2),(w,.035,h),'metal',.01);box((0,-.021,.2+h/2),(w-.025,.008,h-.025),'screen',.004)
def electronics(name):
    if name=='Executive desk':tables('Desk');return
    if name=='Visitor chair':chair('Accent chair');return
    if name in ['Desktop computer','Computer monitor','Monitor','Flat-screen television','Wall-mounted television']:
        monitor(1.2 if 'television' in name else .55,.7 if 'television' in name else .35)
        if name=='Desktop computer':box((.5,.1,.2),(.2,.35,.4),'metal',.012)
        return
    if name=='Laptop':
        box((0,0,.015),(.32,.23,.03),'metal',.01);box((0,.1,.13),(.32,.015,.23),'screen',.005,(-.2,0,0))
        for i in range(5):
            for j in range(10):box((-.13+j*.028,-.08+i*.024,.033),(.02,.016,.004),'steel',.001)
        return
    if name=='Keyboard':
        box((0,0,.015),(.44,.15,.03),'metal',.008)
        for i in range(5):
            for j in range(15):box((-.2+j*.027,-.06+i*.026,.035),(.021,.02,.008),'ceramic',.002)
        return
    if name=='Mouse':sphere((0,0,.025),(.03,.055,.025),'metal');box((0,-.02,.049),(.005,.02,.005),'steel',.001);return
    if name in ['Whiteboard','Corkboard','Noticeboard','Wall calendar','Projector screen']:
        box((0,0,.5),(1.4,.04,1),'legs' if name=='Corkboard' else 'steel',.01);box((0,-.025,.5),(1.34,.01,.94),'ceramic',.002)
        for x in [-.4,-.2,0,.2,.4]:rod((x,-.033,.1),(x,-.033,.9),.002,'artBlue')
        return
    if name in ['Office plant']:plant('Small potted plant');return
    if name in ['Office clock','Alarm clock']:artwork('Wall clock');return
    if name in ['Wastebasket']:pot(.16,.35);return
    if name in ['TV stand']:cabinet(1.5,.4,.5,doors=True);return
    if name in ['Speaker','Bookshelf speaker','Floor speaker','Stereo system','Home theater system','Smart speaker']:
        h=1 if name=='Floor speaker' else .28;box((0,0,h/2),(.2,.2,h),'metal',.012)
        for z in [.09,h*.7]:sphere((0,-.11,z),(.07,.012,.07),'steel');ring((0,-.12,z),.065,'metal',.006,'y')
        if name in ['Stereo system','Home theater system']:
            for x in [-.35,.35]:box((x,0,h/2),(.2,.2,h),'metal',.012)
        return
    if name=='Record player':
        box((0,0,.06),(.4,.3,.12),'legs',.015);rod((0,0,.12),(0,0,.13),.13,'metal');curve([(.17,.1,.15),(.15,-.08,.15),(.07,-.1,.15)],.006,'steel');return
    if name in ['Gaming controller','Video game accessories']:
        sphere((0,0,.035),(.12,.07,.035),'metal')
        for x in [-.07,.07]:rod((x,0,.04),(x,0,.055),.018,'steel')
        return
    if name in ['Paper tray','Pen holder','Book stand']:decor('Desk organizer');return
    if name in ['Telephone']:box((0,0,.04),(.22,.16,.08),'metal',.02);rod((-.12,0,.09),(.12,0,.09),.025,'steel');return
    if name=='Camera':
        box((0,0,.07),(.18,.06,.14),'metal',.015);rod((0,-.04,.07),(0,-.13,.07),.045,'steel');return
    w=.32;h=.16 if name not in ['Gaming console','Router'] else .08
    box((0,0,h/2),(w,.24,h),'metal',.015)
    if name in ['Printer']:box((0,-.12,.08),(.24,.13,.01),'ceramic',.002);box((0,0,h+.01),(.23,.16,.02),'steel',.003)
    elif name=='Projector':rod((.08,-.12,.08),(.08,-.15,.08),.035,'glass')
    elif name=='Router':
        for x in [-.12,.12]:rod((x,.08,.08),(x,.08,.3),.007,'metal')
    elif name=='Radio':ring((-.07,-.125,.08),.05,'steel',.01,'y');sphere((.1,-.125,.08),(.015,.01,.015),'steel')
    else:
        for i in range(6):box((-.12+i*.045,-.125,.05),(.02,.005,.006),'artBlue',.001)
def nursery(name):
    if name in ['Nursery dresser']:cabinet(1.1,.5,.85,3);return
    if name in ['Toy shelf',"Children's bookshelf"]:shelves(.85,.3,1,3);return
    if name in ["Children's desk",'Activity table']:table(.85,.55,.5);return
    if name in ["Children's chair",'High chair']:
        chair('Dining chair')
        if name=="Children's chair":
            for obj in objects:obj.location*=.65;obj.scale*=.65
        else:box((0,-.28,.64),(.58,.28,.035),'ceramic',.015)
        return
    if name in ['Play mat',"Children's rug"]:textile('Small accent rug');return
    if name in ['Teddy bear','Stuffed animal']:
        sphere((0,0,.2),(.13,.1,.17),'accent');sphere((0,0,.42),(.12,.1,.12),'accent')
        for x in [-1,1]:
            sphere((x*.1,0,.51),(.04,.025,.04),'accent');sphere((x*.16,0,.24),(.06,.055,.09),'accent');sphere((x*.09,-.05,.07),(.065,.08,.055),'accent');sphere((x*.045,-.095,.45),(.009,.007,.009),'metal')
        sphere((0,-.11,.4),(.03,.025,.02),'ceramic');return
    if name in ['Toy car','Toy train']:
        box((0,0,.12),(.32,.15,.12),'artBlue',.025);box((0,.02,.21),(.17,.13,.08),'flower',.02)
        for x in [-.11,.11]:
            for y in [-.085,.085]:sphere((x,y,.06),(.04,.025,.04),'metal')
        if name=='Toy train':rod((-.1,0,.16),(-.1,0,.3),.025,'metal')
        return
    if name=='Toy blocks':
        for i in range(8):box((((i%3)-1)*.12,((i//3)%2)*.12,.06+(i//6)*.12),(.1,.1,.1),['flower','artBlue','artGold'][i%3],.008)
        return
    if name in ['Play tent','Dollhouse']:
        box((0,0,.02),(1.2 if name=='Play tent' else .6,.8,.04),'legs',.01)
        for x in [-1,1]:box((x*.25,0,.55),(.65,.8,.025),'fabric' if name=='Play tent' else 'flower',.005,(0,x*.6,0))
        if name=='Dollhouse':box((0,.37,.3),(.58,.03,.55),'ceramic',.01);box((0,0,.3),(.58,.03,.025),'legs',.005)
        return
    if name=="Children's wall art":artwork('Abstract artwork');return
    if name=='Night light':sphere((0,0,.12),(.12,.12,.12),'bulb');return
    if name=='Mobile decoration':
        ring((0,0,.5),.2,'legs',.008)
        for i in range(5):a=i*math.tau/5;x,y=math.cos(a)*.2,math.sin(a)*.2;rod((x,y,.5),(x,y,.2),.002,'fabric');sphere((x,y,.15),(.04,.025,.04),'flower' if i%2 else 'artGold')
manifest=[]
seating=(ROOT/'scripts'/'build_seating_collection.py').read_text()
export_block=textwrap.dedent(seating.split('    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.')[1].split("(SOURCE/'seating-manifest.json')")[0]).replace("'category':'Seating'","'category':category").replace("'placementType':'floor'","'placementType':placement")
export_block=export_block.replace("{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric'}","{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric','ceramic':'ceramic','steel':'metal'}")
for index,name in enumerate(all_names[261:380]):
    objects=[];slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-');placement='floor';category='Kitchen' if index<33 else 'Bathroom' if index<60 else 'Office and electronics' if index<100 else 'Nursery'
    if index<33:
        appliance(name)
        if name in ['Wall kitchen cabinet','Range hood','Pot rack']:placement='wall'
        elif index>=16 and name not in ['Trash bin','Recycling bin','Bar cart']:placement='surface'
    elif index<60:
        bathroom(name)
        if name in ['Wall-hung toilet','Bathroom mirror','Mirror cabinet','Towel rack','Towel rail','Towel ring','Toilet paper holder','Shower shelf','Shower fixture']:placement='wall'
        elif name in ['Soap dispenser','Toothbrush holder','Decorative toiletries']:placement='surface'
    elif index<100:
        electronics(name)
        if name in ['Whiteboard','Corkboard','Noticeboard','Wall calendar','Wall-mounted television','Projector screen','Security alarm']:placement='wall'
        elif name not in ['Executive desk','Visitor chair','Wastebasket','TV stand','Floor speaker','Home theater system']:placement='surface'
    else:
        nursery(name)
        if name=="Children's wall art":placement='wall'
        elif name=='Mobile decoration':placement='ceiling'
    if not objects:raise ValueError('No recipe for '+name)
    exec(compile(export_block,'asset_export','exec'))
(SOURCE/'equipment-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'EquipmentCatalog.js').write_text('// Generated original Blender models.\nexport const EQUIPMENT_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'equipment-collection.blend'))
thumbnail_block=seating.split("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'")[1].split("print('SEATING COLLECTION COMPLETE")[0]
exec(compile("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'"+thumbnail_block,'thumbnails','exec'))
print('EQUIPMENT COMPLETE: '+str(len(manifest)))
