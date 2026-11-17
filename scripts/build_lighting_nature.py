"""Original lights, plants, textiles and small decorations (156–260)."""
import bpy,json,math,re,textwrap
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
shared=(ROOT/'scripts'/'build_storage_decor.py').read_text().rsplit('\nmanifest=[]',1)[0].replace("'HD Decor'","'HD Nature'")
exec(compile(shared,'decor_primitives','exec'))
M['leaf']=material('leaf',(.13,.3,.12));M['leafLight']=material('leafLight',(.3,.46,.18));M['flower']=material('flower',(.65,.27,.28));M['soil']=material('soil',(.10,.065,.035));M['bulb']=material('bulb',(.95,.82,.55),.2)
def cone(pos,r1,r2,height,part='ceramic'):
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r1,radius2=r2,depth=height,location=pos);obj=register(bpy.context.object,part)
    mod=obj.modifiers.new('Rim highlights','BEVEL');mod.width=.007;mod.segments=2
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def shade(z,r=.2):
    cone((0,0,z),r,r*.65,r*1.4,'fabric');cone((0,0,z-r*.65),r*.92,r*.9,.012,'bulb');sphere((0,0,z-r*.25),(.045,.045,.07),'bulb')
def light(name):
    if name in ['Decorative string lights','LED strip','Under-cabinet light','Track light']:
        length=1.5;rod((-.75,0,.1),(.75,0,.1),.008,'metal')
        if name in ['LED strip','Under-cabinet light']:box((0,0,.1),(length,.025,.015),'bulb',.005)
        else:
            for i in range(8 if name=='Decorative string lights' else 4):
                x=-.7+i*1.4/(7 if name=='Decorative string lights' else 3);rod((x,0,.1),(x,0,.02),.007,'metal');sphere((x,0,0),(.025,.025,.035),'bulb')
        return
    if name in ['Lantern','Outdoor wall light','Hanging outdoor lantern']:
        cone((0,0,.35),.15,.04,.1,'metal');box((0,0,.03),(.3,.3,.06),'metal',.01)
        for x in [-.13,.13]:
            for y in [-.13,.13]:rod((x,y,.05),(x,y,.3),.012,'metal')
        box((0,0,.18),(.24,.24,.25),'glass',.002);sphere((0,0,.15),(.05,.05,.09),'bulb');ring((0,0,.45),.07,'metal',.012,'y');return
    if name in ['Candle holder','Standing candle','Candle holder']:
        rod((0,0,0),(0,0,.04),.11,'metal');rod((0,0,.04),(0,0,.35),.022,'metal');rod((0,0,.35),(0,0,.39),.065,'metal');rod((0,0,.39),(0,0,.6),.035,'ceramic');sphere((0,0,.64),(.012,.012,.035),'bulb');return
    if name in ['Wall sconce','Wall-mounted reading lamp','Picture light']:
        box((0,.06,.2),(.12,.035,.22),'metal',.012);rod((0,.04,.2),(0,-.15,.25),.015,'metal')
        if name=='Picture light':rod((-.3,-.15,.25),(.3,-.15,.25),.035,'metal');box((0,-.17,.23),(.55,.025,.015),'bulb',.003)
        else:shade(.3,.12)
        return
    if name in ['Ceiling light','Flush-mount ceiling light','Recessed downlight']:
        rod((0,0,.015),(0,0,.08),.2 if name!='Recessed downlight' else .09,'metal');sphere((0,0,.015),(.18,.18,.05),'bulb');return
    if name=='Ceiling fan with light':
        rod((0,0,.05),(0,0,.35),.04,'metal');sphere((0,0,.05),(.13,.13,.08),'bulb')
        for i in range(5):
            a=i*math.tau/5;box((math.cos(a)*.35,math.sin(a)*.35,.14),(.55,.13,.025),'legs',.02,(0,0,a))
        return
    if name=='Chandelier':
        rod((0,0,.4),(0,0,1.1),.02,'metal')
        for i in range(6):
            a=i*math.tau/6;x,y=math.cos(a)*.34,math.sin(a)*.34
            curve([(0,0,.5),(x*.4,y*.4,.25),(x,y,.3),(x,y,.5)],.015,'metal');rod((x,y,.5),(x,y,.65),.025,'ceramic');sphere((x,y,.69),(.02,.02,.04),'bulb')
        return
    pendant=name in ['Pendant light'];floor='floor' in name.lower() or name=='Garden path light';h=1.5 if floor else .55
    if pendant:
        rod((0,0,.2),(0,0,1),.008,'metal');shade(.2,.3);return
    rod((0,0,.02),(0,0,.05),.18 if floor else .13,'metal')
    if name=='Tripod floor lamp':
        for i in range(3):
            a=i*math.tau/3;rod((math.cos(a)*.3,math.sin(a)*.3,0),(0,0,h*.8),.025)
    elif name=='Arc floor lamp':curve([(0,0,.05),(0,0,1.3),(.2,0,1.65),(.6,0,1.7),(.8,0,1.5)],.02,'metal')
    elif name=='Desk lamp':curve([(0,0,.05),(0,0,.3),(.2,0,.5)],.018,'metal')
    else:rod((0,0,.05),(0,0,h*.85),.02,'metal')
    shade(h*.85,.22 if floor else .15)
def pot(r=.16,h=.3):
    cone((0,0,h/2),r*.75,r,h,'ceramic');ring((0,0,h-.012),r,'ceramic',.015);rod((0,0,h-.025),(0,0,h-.015),r*.9,'soil')
def leaf(a,b,width=.07,part='leaf'):
    a,b=Vector(a),Vector(b);obj=sphere((a+b)/2,(width,.018,(b-a).length/2),part);obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
def plant(name):
    scale=.5 if name in ['Small potted plant','Succulent','Herb planter'] else 1.7 if name in ['Large floor plant','Indoor tree','Palm','Decorative topiary'] else 1
    if name in ['Flower bouquet','Decorative branches','Vase with flowers']:pot(.12,.3)
    elif name in ['Plant stand','Plant shelf']:
        shelves(.8,.3,1.2,3)
        for i in range(3):
            start=len(objects);pot(.12,.22)
            for obj in objects[start:]:obj.location.z+=i*.37
        return
    elif name in ['Vertical plant wall','Wall-mounted planter','Window planter','Outdoor planter']:
        w=1 if name!='Wall-mounted planter' else .4;box((0,0,.18),(w,.3,.36),'ceramic',.025)
        for x in [-w*.3,0,w*.3]:
            for i in range(5):a=i*math.tau/5;leaf((x,0,.3),(x+.18*math.cos(a),.1*math.sin(a),.65),.06)
        return
    else:pot(.17*scale,.3*scale)
    start_z=.28*scale;top=.95*scale
    if name=='Cactus':
        rod((0,0,start_z),(0,0,top),.075,'leaf');sphere((0,0,top),(.075,.075,.075),'leaf')
        for side in [-1,1]:curve([(0,0,.5),(side*.18,0,.5),(side*.18,0,.75)],.045,'leaf')
        for i in range(12):rod((.07,-.01,.35+i*.04),(.082,-.01,.35+i*.04),.002,'ceramic')
    elif name in ['Snake plant','Bamboo blinds']:
        for i in range(9):a=i*2.4;leaf((0,0,start_z),(.16*math.cos(a),.16*math.sin(a),.65+(i%3)*.15),.035)
    elif name=='Decorative topiary':
        rod((0,0,start_z),(0,0,top),.025,'legs');sphere((0,0,top),(.3,.3,.32),'leaf')
    elif name in ['Garden shrub','Bonsai']:
        rod((0,0,start_z),(.05,0,top*.7),.03,'legs')
        for i in range(7):a=i*2.4;sphere((math.cos(a)*.17,math.sin(a)*.17,top*.7+(i%2)*.1),(.18,.16,.13),'leaf')
    else:
        rod((0,0,start_z),(0,0,top),.015*scale,'legs' if name=='Indoor tree' else 'leaf')
        n=18 if name in ['Fern','Palm','Monstera-style plant'] else 12
        for i in range(n):
            a=i*2.4;z=start_z+(top-start_z)*(i+1)/(n+1);r=(.3 if name!='Succulent' else .18)*scale
            end=(math.cos(a)*r,math.sin(a)*r,z+.18*scale)
            leaf((0,0,z),end,.06*scale,'leafLight' if i%3==0 else 'leaf')
            if name in ['Flowering plant','Flower bouquet','Vase with flowers']:
                for j in range(5):angle=j*math.tau/5;sphere((end[0]+.025*math.cos(angle),end[1]+.025*math.sin(angle),end[2]),(.035,.025,.02),'flower')
    if name in ['Hanging plant','Hanging plant holder']:
        for i in range(3):a=i*math.tau/3;rod((math.cos(a)*.15,math.sin(a)*.15,.25),(0,0,1.2),.005,'accent')
    if name=='Terrarium':
        for x in [-.2,.2]:
            for y in [-.2,.2]:rod((x,y,0),(x,y,.65),.006,'metal')
        box((0,0,.33),(.4,.4,.65),'glass',.002)
def textile(name):
    if 'rug' in name.lower() or name in ['Doormat','Bath mat']:
        w,d=(.65,2.4) if name=='Runner rug' else (.75,.5) if name in ['Doormat','Bath mat'] else (2.6,1.8) if name=='Large living-room rug' else (1.8,1.3)
        if name=='Round rug':rod((0,0,.002),(0,0,.018),.9,'fabric')
        else:
            box((0,0,.012),(w,d,.024),'fabric',.01)
            for x in [-1,1]:box((x*(w/2-.06),0,.027),(.035,d-.05,.006),'accent',.002)
            for y in [-1,1]:box((0,y*(d/2-.06),.027),(w-.05,.035,.006),'accent',.002)
            if name in ['Patterned rug','Woven rug']:
                for i in range(12):box((0,-d/2+(i+.5)*d/12,.028),(w-.15,.02,.004),'accent',.001)
            if name=='Shag rug':
                for i in range(100):x=((i*17)%23)/23*w-w/2;y=((i*11)%29)/29*d-d/2;rod((x,y,.02),(x+.01,y,.055),.007,'fabric')
        return
    if name in ['Decorative cushion','Throw pillow','Floor cushion']:cushion(0,0,.12,.45,.45,.22);return
    if name=='Fabric wall hanging':fabric_panel(0,.9,1.2,.025,12);return
    w,d=(1.6,2) if name in ['Bedspread','Duvet','Decorative bedding'] else (.4,1.5) if name=='Table runner' else (1.6,1.4)
    box((0,0,.04),(w,d,.08 if name=='Duvet' else .025),'bedding',.025)
    for i in range(10):curve([(-w*.45+i*w*.1,y,.055+.005*math.cos(y*8))for y in [-d*.45,0,d*.45]],.004,'accent')
def decor(name):
    if 'book' in name.lower() or name in ['Photo album','Magazine stack']:
        count=5 if name in ['Decorative books','Stacked books','Magazine stack'] else 1
        for i in range(count):
            box((i*.01,0,.025+i*.045),(.25,.18,.04),['artBlue','artGold','artGreen'][i%3],.003)
            box((i*.01,-.005,.025+i*.045),(.23,.17,.03),'ceramic',.001)
        if name=='Bookends':
            for x in [-.18,.18]:box((x,0,.12),(.025,.2,.24),'metal',.003)
        return
    if name in ['Decorative vase','Decorative bottle','Perfume bottles']:
        pot(.12,.27);cone((0,0,.32),.12,.055,.14,'ceramic');rod((0,0,.39),(0,0,.47),.055,'ceramic');ring((0,0,.47),.055,'metal',.008);return
    if name in ['Ceramic bowl','Decorative plate','Fruit bowl']:
        cone((0,0,.05),.12,.2,.1,'ceramic');rod((0,0,.105),(0,0,.11),.18,'accent');ring((0,0,.11),.2,'ceramic',.01)
        if name=='Fruit bowl':
            for i in range(5):a=i*2.4;sphere((math.cos(a)*.1,math.sin(a)*.1,.15),(.05,.05,.05),'flower' if i%2 else 'artGold')
        return
    if name in ['Sculpture','Figurine','Abstract statue','Bust sculpture','Small tabletop ornament','Collectible display']:
        box((0,0,.025),(.22,.18,.05),'metal',.008)
        if name=='Abstract statue':
            for i in range(3):ring((0,0,.14+i*.14),.1,'metal',.02,'y')
        else:
            sphere((0,0,.18),(.1,.065,.13),'ceramic');sphere((0,0,.36),(.065,.06,.08),'ceramic')
        return
    if name in ['Candlestick','Candle','Candle tray']:
        if name!='Candle':rod((0,0,0),(0,0,.035),.14,'metal')
        if name=='Candlestick':rod((0,0,.035),(0,0,.25),.02,'metal')
        rod((0,0,.04 if name!='Candlestick' else .25),(0,0,.25 if name!='Candlestick' else .4),.035,'ceramic');rod((0,0,.25),(0,0,.26),.002,'metal');return
    if name in ['Picture frame','Photo frame']:artwork('Framed painting');return
    if name=='Globe':
        rod((0,0,0),(0,0,.03),.12,'metal');rod((0,0,.03),(0,0,.2),.01,'metal');sphere((0,0,.32),(.14,.14,.14),'artBlue');ring((0,0,.32),.16,'metal',.006,'y');return
    if name=='Hourglass':
        for z in [.02,.3]:rod((0,0,z),(0,0,z+.02),.08,'legs')
        cone((0,0,.1),.06,.005,.13,'glass');cone((0,0,.23),.005,.06,.13,'glass')
        for x in [-.07,.07]:rod((x,0,.03),(x,0,.3),.008,'metal')
        return
    if name in ['Clock']:artwork('Wall clock');return
    if name in ['Basket','Woven basket','Umbrella stand','Magazine rack']:
        h=.55 if name=='Umbrella stand' else .25;pot(.16,h)
        for z in [.05,.1,.15,.2]:ring((0,0,z),.14,'legs',.004)
        curve([(-.15,0,h),(-.15,0,h+.15),(.15,0,h+.15),(.15,0,h)],.01,'legs');return
    # Desk organizers, trays and boxes use visibly different compartments/lids.
    w=.32;h=.12 if name not in ['Desk organizer','Tissue box'] else .18
    box((0,0,h/2),(w,.22,h),'legs',.012)
    if name in ['Decorative box','Jewelry box']:box((0,0,h+.015),(w+.02,.24,.03),'accent',.008);sphere((0,-.125,h*.7),(.015,.008,.015),'metal')
    elif name=='Tissue box':box((0,0,h+.035),(.12,.025,.09),'ceramic',.006)
    else:
        for x in [-.1,0,.1]:box((x,0,h+.01),(.01,.2,.02),'metal',.002)
manifest=[]
seating=(ROOT/'scripts'/'build_seating_collection.py').read_text()
export_block=textwrap.dedent(seating.split('    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.')[1].split("(SOURCE/'seating-manifest.json')")[0]).replace("'category':'Seating'","'category':category").replace("'placementType':'floor'","'placementType':placement")
export_block=export_block.replace("{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric'}","{'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric','ceramic':'ceramic','bedding':'fabric'}")
for index,name in enumerate(all_names[156:261]):
    objects=[];slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-');placement='floor';category='Lighting' if index<25 else 'Plants' if index<51 else 'Textiles' if index<72 else 'Decorations'
    if index<25:
        light(name)
        if name in ['Pendant light','Chandelier','Ceiling light','Flush-mount ceiling light','Recessed downlight','Track light','Ceiling fan with light','Hanging outdoor lantern']:placement='ceiling'
        elif name in ['Wall sconce','Wall-mounted reading lamp','Picture light','Outdoor wall light','Under-cabinet light','LED strip']:placement='wall'
        elif name in ['Table lamp','Desk lamp','Bedside lamp','Candle holder']:placement='surface'
    elif index<51:
        plant(name)
        if name=='Hanging plant':placement='ceiling'
        elif name in ['Vertical plant wall','Wall-mounted planter','Window planter']:placement='wall'
    elif index<72:
        textile(name)
        if name=='Fabric wall hanging':placement='wall'
        elif name in ['Decorative cushion','Throw pillow','Throw blanket','Bedspread','Duvet','Decorative bedding','Table runner','Tablecloth']:placement='surface'
    else:decor(name);placement='surface'
    exec(compile(export_block,'asset_export','exec'))
(SOURCE/'lighting-nature-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'LightingNatureCatalog.js').write_text('// Generated original Blender models.\nexport const LIGHTING_NATURE_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'lighting-nature-collection.blend'))
thumbnail_block=seating.split("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'")[1].split("print('SEATING COLLECTION COMPLETE")[0]
exec(compile("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'"+thumbnail_block,'thumbnails','exec'))
print('LIGHTING NATURE COMPLETE: '+str(len(manifest)))
