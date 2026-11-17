"""Storage, window treatments and original wall decor: requested entries 83–155."""
import bpy, json, math, re, textwrap
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
shared=(ROOT/'scripts'/'build_household_collection.py').read_text().rsplit('\nmanifest=[]',1)[0].replace("'HD Household'","'HD Decor'")
exec(compile(shared,'household_primitives','exec'))
M['artBlue']=material('artBlue',(.10,.23,.38));M['artGold']=material('artGold',(.8,.5,.19));M['artGreen']=material('artGreen',(.18,.35,.22))
def ring(center,radius,part='metal',thick=.012,axis='z'):
    x,y,z=center
    points=[(x+radius*math.cos(i*math.tau/40),y+radius*math.sin(i*math.tau/40),z) if axis=='z' else (x+radius*math.cos(i*math.tau/40),y,z+radius*math.sin(i*math.tau/40))for i in range(40)]
    curve(points,thick,part,True)
def storage(name):
    if name in ['Floating shelf','Display shelf','Wall bookshelf']:
        levels=1 if name=='Floating shelf' else 3
        for i in range(levels):
            z=.06+i*.38;box((0,0,z),(1.1,.25,.045),'legs',.008)
            for x in [-.42,.42]:rod((x,.1,z),(x,.1,z+.22),.012,'metal')
        return
    if name=='Corner shelf':
        for z in [.1,.5,.9,1.3,1.7]:
            box((-.2,0,z),(.65,.35,.04),'legs',.008);box((0,.2,z),(.35,.65,.04),'legs',.008)
        rod((-.48,.35,0),(-.48,.35,1.8),.02);rod((.15,.65,0),(.15,.65,1.8),.02);return
    if name in ['Coat rack','Coat stand']:
        rod((0,0,.05),(0,0,1.7),.035)
        for i in range(4):
            a=i*math.tau/4;rod((0,0,.08),(math.cos(a)*.35,math.sin(a)*.35,.02),.024)
            rod((0,0,1.4),(math.cos(a)*.25,math.sin(a)*.25,1.6),.018)
            sphere((math.cos(a)*.25,math.sin(a)*.25,1.6),(.035,.035,.035),'legs')
        return
    if name in ['Shoe rack','Wine rack']:
        if name=='Shoe rack':shelves(.8,.3,.6,3)
        else:
            shelves(.7,.3,1,4)
            for z in [.18,.4,.62,.84]:
                for x in [-.22,0,.22]:rod((x,-.1,z),(x,.18,z),.065,'artGreen')
        return
    if name=='Storage baskets':
        for i in range(3):
            x=(i-1)*.35;box((x,0,.17),(.32,.28,.34),'accent',.025)
            for z in [.06,.12,.18,.24,.3]:curve([(x-.16,-.14,z),(x+.16,-.14,z),(x+.16,.14,z),(x-.16,.14,z)],.004,'legs',True)
        return
    if name=='Modular storage unit':
        for x in [-.6,0,.6]:
            for z in [.3,.9,1.5]:
                box((x-.28,0,z),(.04,.4,.56),'legs',.006);box((x+.28,0,z),(.04,.4,.56),'legs',.006)
                for y in [-.28,.28]:box((x,0,z+y),(.6,.4,.04),'legs',.006)
        return
    if name in ['Bookshelf','Bookcase','Display cabinet','Glass-front cabinet','Linen cabinet','Pantry cabinet']:
        w=.9;h=1.8 if name!='Pantry cabinet' else 2.1;shelves(w,.36,h,5)
        box((0,.17,h/2),(w,.025,h),'legs',.004)
        if name in ['Bookshelf','Bookcase']:
            for level in range(4):
                for i in range(5):box((-.32+i*.13,-.02,.12+level*.34+.12),(.08,.23,.2+(i%3)*.03),['artBlue','artGold','artGreen'][i%3],.005)
        if name in ['Display cabinet','Glass-front cabinet']:
            for x in [-.43,0,.43]:rod((x,-.19,.08),(x,-.19,h-.05),.018,'metal')
            box((0,-.19,h/2),(w-.05,.012,h-.15),'glass',.002)
        return
    tall=name in ['Locker','Storage cabinet'];wall=name in ['Kitchen wall cabinet','Medicine cabinet'];w=1.4 if name in ['Sideboard','Buffet','Credenza','TV console','Media cabinet','Bathroom vanity'] else .75
    h=1.9 if tall else .65 if wall else .6 if name in ['TV console','Media cabinet','Storage chest'] else .9
    cabinet(w,.45,h,4 if name=='Filing cabinet' else 2,doors=name not in ['Filing cabinet','Storage chest','Shoe cabinet'])
    if name=='Locker':
        for z in [1.5,1.55,1.6,1.65]:box((0,-.247,z),(.45,.01,.012),'metal',.002)
    if name=='Bathroom vanity':
        box((0,0,h+.05),(w+.05,.52,.07),'ceramic',.02);sphere((0,-.03,h+.1),(.3,.16,.035),'glass')
        curve([(0,.16,h+.05),(0,.16,h+.32),(0,-.03,h+.32)],.015,'metal')
    if name=='Entryway organizer':
        for x in [-.3,0,.3]:rod((x,.18,1),(x,.18,1.7),.02);rod((x,.18,1.55),(x,0,1.6),.015,'metal')
        box((0,.18,1.75),(.85,.08,.1),'legs',.01)
def fabric_panel(x,width,height=2.1,depth=.04,folds=12,part='fabric'):
    vertices=[];faces=[];nx=folds*4;ny=20
    for row in range(ny+1):
        z=height*row/ny
        for col in range(nx+1):
            u=col/nx;vertices.append((x+(u-.5)*width,depth*math.cos(u*math.tau*folds),z+.012*math.cos(u*math.tau*folds)*(1-row/ny)))
    for row in range(ny):
        for col in range(nx):
            a=row*(nx+1)+col;faces.append((a,a+1,a+nx+2,a+nx+1))
    data=bpy.data.meshes.new('Woven folds');data.from_pydata(vertices,[],faces);data.update();obj=bpy.data.objects.new('fabric',data);collection.objects.link(obj);data.materials.append(M[part]);objects.append(obj)
    for face in data.polygons:face.use_smooth=True
    mod=obj.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.003
def curtains(name):
    w=1.7;h=1.3 if name=='Short curtains' else 2.2
    rod((-w/2-.12,0,h+.08),(w/2+.12,0,h+.08),.022,'metal')
    for x in [-w/2-.15,w/2+.15]:sphere((x,0,h+.08),(.045,.045,.045),'metal')
    if name=='Curtain rod':return
    if name=='Curtain tiebacks':
        for x in [-.7,.7]:ring((x,0,.8),.09,'metal',.009,'y')
        return
    if name in ['Roller blinds','Roman shades','Venetian blinds','Vertical blinds','Bamboo blinds','Decorative window shutters']:
        box((0,0,h),(w,.09,.08),'metal',.012)
        if name=='Roller blinds':
            fabric_panel(0,w,h,.002,1);rod((-w/2,0,0),(w/2,0,0),.014,'metal')
        elif name=='Roman shades':
            for i in range(7):box((0,0,i*h/7+h/14),(w,.045,h/7+.025),'fabric',.02)
        elif name=='Vertical blinds':
            for i in range(16):box((-w/2+(i+.5)*w/16,0,h/2),(w/16-.008,.018,h),'fabric',.003,(0,0,.15))
        elif name=='Decorative window shutters':
            for x in [-.9,.9]:
                box((x,0,h/2),(.3,.06,h),'legs',.01)
                for i in range(20):box((x,-.045,(i+.5)*h/20),(.25,.045,h/25),'legs',.003,(.25,0,0))
        else:
            for i in range(28):box((0,0,(i+.5)*h/28),(w,.06,.025),'legs' if name=='Bamboo blinds' else 'metal',.003,(.25,0,0))
            for x in [-.6,.6]:rod((x,-.04,0),(x,-.04,h),.003,'accent')
        return
    if name=='Fabric valance':fabric_panel(0,w,.4,.055,14);return
    if name=='Single curtain panel':fabric_panel(0,w,h,.04,16)
    else:
        for x in [-.55,.55]:fabric_panel(x,.65,h,.04,7)
        if name in ['Layered curtains','Sheer curtains']:fabric_panel(0,w,h-.03,.015,18,'ceramic')
    for i in range(16):ring((-w/2+i*w/15,0,h+.03),.03,'metal',.005,'y')
def artwork(name):
    if name in ['Wall mirror','Full-length mirror','Round mirror','Decorative mirror','Ornate mirror']:
        h=1.6 if name=='Full-length mirror' else .8
        if name=='Round mirror':
            ring((0,0,.45),.43,'metal',.025,'y');sphere((0,0,.45),(.4,.012,.4),'glass')
        else:
            box((0,0,h/2),(.7,.055,h),'legs',.018);box((0,-.035,h/2),(.62,.014,h-.08),'glass',.008)
            if name=='Ornate mirror':
                for i in range(16):sphere((-.35+i*.7/15,-.025,h),(.025,.025,.04),'accent')
        return
    if name=='Wall clock':
        ring((0,0,.3),.29,'legs',.02,'y');sphere((0,0,.3),(.27,.02,.27),'ceramic')
        for i in range(12):
            a=i*math.tau/12;box((math.sin(a)*.22,-.03,.3+math.cos(a)*.22),(.012,.012,.035),'metal',.002,(0,a,0))
        rod((0,-.05,.3),(.12,-.05,.4),.009,'metal');rod((0,-.05,.3),(-.07,-.05,.47),.007,'metal');return
    if name in ['Wall tapestry','Macramé wall hanging']:
        rod((-.4,0,1),(.4,0,1),.015)
        if name=='Wall tapestry':fabric_panel(0,.75,.9,.012,10)
        else:
            for i in range(15):
                x=-.35+i*.05;curve([(x,0,.98),(x+.025,-.015,.6),(x,0,.25+abs(x)*.8)],.005,'fabric')
            for z in [.6,.7,.8]:curve([(-.35,0,z),(-.18,0,z-.1),(0,0,z-.2),(.18,0,z-.1),(.35,0,z)],.006,'accent')
        return
    if name in ['Wall sculpture','Wall-mounted ornament']:
        for i in range(5):ring(((i-2)*.16,0,.3+(i%2)*.2),.18,'metal',.012,'y')
        return
    if name=='Decorative wall molding':
        for x in [-.5,.5]:box((x,0,.5),(.025,.04,1),'legs',.006)
        for z in [0,1]:box((0,0,z),(1,.04,.025),'legs',.006)
        return
    if name in ['Decorative wall panel','Wall-mounted plant holder']:
        for i in range(12):box((-.5+i/11,0,.6),(.035,.05,1.2),'legs',.006)
        if name=='Wall-mounted plant holder':sphere((0,-.15,.5),(.16,.15,.17),'ceramic');rod((0,-.15,.6),(.12,-.15,.95),.01,'artGreen')
        return
    count=3 if name in ['Triptych artwork','Gallery wall set'] else 1
    for i in range(count):
        x=(i-(count-1)/2)*.58;w=.5 if count>1 else .8;h=.75
        box((x,0,h/2),(w,.045,h),'legs',.008);box((x,-.026,h/2),(w-.05,.012,h-.05),'ceramic',.002)
        if name in ['Landscape painting','Art print']:
            for j,part in enumerate(['artBlue','artGreen','artGold']):box((x,-.038-j*.002,.15+j*.16),(w-.07,.006,.17),part,.002)
        elif name=='Portrait painting':
            sphere((x,-.05,.48),(.12,.01,.16),'accent');sphere((x,-.05,.2),(.2,.01,.18),'artBlue')
        else:
            for j in range(3):box((x+(j-1)*w*.18,-.04-j*.003,.2+j*.16),(w*.35,.008,.17),['artBlue','artGold','artGreen'][j],.01,(0,(j-1)*.2,0))
manifest=[]
seating=(ROOT/'scripts'/'build_seating_collection.py').read_text()
export_block=textwrap.dedent(seating.split('    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.')[1].split("(SOURCE/'seating-manifest.json')")[0])
export_block=export_block.replace("'category':'Seating'","'category':category").replace("'placementType':'floor'","'placementType':placement")
for index,name in enumerate(all_names[83:156]):
    objects=[];slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-');category='Storage' if index<31 else 'Window treatments' if index<48 else 'Wall decor';placement='floor'
    if index<31:
        storage(name)
        if name in ['Wall bookshelf','Floating shelf','Kitchen wall cabinet','Medicine cabinet','Coat rack']:placement='wall'
    elif index<48:curtains(name);placement='window'
    else:artwork(name);placement='wall'
    exec(compile(export_block,'asset_export','exec'))
(SOURCE/'storage-decor-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'StorageDecorCatalog.js').write_text('// Generated original Blender models.\nexport const STORAGE_DECOR_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'storage-decor-collection.blend'))
thumbnail_block=seating.split("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'")[1].split("print('SEATING COLLECTION COMPLETE")[0]
exec(compile("scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'"+thumbnail_block,'thumbnails','exec'))
print('STORAGE DECOR COMPLETE: '+str(len(manifest)))
