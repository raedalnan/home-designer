"""Original stylized-realistic seating. Run in Blender's Python console.
Source scene stays outside public; web assets and thumbnails are exported individually.
"""
import bpy, math, json, re
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
SOURCE=ROOT/'assets-source'/'furniture'
OUT=ROOT/'public'/'furniture-v2';OUT.mkdir(exist_ok=True)
THUMBS=ROOT/'public'/'thumbnails';THUMBS.mkdir(exist_ok=True)
names=json.loads((SOURCE/'requested-items.json').read_text())[:27]
for obj in bpy.context.scene.objects: obj.hide_render=True
for old in list(bpy.data.collections):
    if old.name.startswith('HD Seating'):
        for obj in list(old.all_objects):bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(old)
collection=bpy.data.collections.new('HD Seating');bpy.context.scene.collection.children.link(collection)
def material(name,color,roughness=.7,metal=0):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(*color,1);node.inputs['Roughness'].default_value=roughness;node.inputs['Metallic'].default_value=metal
    return mat
M={'fabric':material('fabric',(.36,.48,.48)), 'legs':material('legs',(.42,.25,.13),.42),'metal':material('metal',(.09,.105,.12),.28,.65),'accent':material('accent',(.79,.62,.40)), 'seams':material('seams',(.24,.34,.34)), 'buttons':material('buttons',(.33,.43,.43))}
objects=[]
def register(obj,part):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    collection.objects.link(obj);obj.data.materials.append(M[part]);obj.name=part;objects.append(obj);return obj
def box(pos,size,part='fabric',bevel=.035,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);obj=register(bpy.context.object,part);obj.scale=size;obj.rotation_euler=rotation
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Tailored edges','BEVEL');mod.width=min(bevel,min(size)*.4);mod.segments=3
        obj.modifiers.new('Weighted highlights','WEIGHTED_NORMAL')
    return obj
def sphere(pos,size,part='fabric'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=pos);obj=register(bpy.context.object,part);obj.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def rod(a,b,r=.025,part='legs',r2=None):
    a,b=Vector(a),Vector(b);v=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=r2 if r2 is not None else r,depth=v.length,location=(a+b)/2)
    obj=register(bpy.context.object,part);obj.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def curve(points,r=.008,part='seams',closed=False):
    data=bpy.data.curves.new('Stitching','CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=1
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for point,co in zip(spline.points,points):point.co=(*co,1)
    spline.use_cyclic_u=closed;obj=bpy.data.objects.new(part,data);collection.objects.link(obj);obj.data.materials.append(M[part]);objects.append(obj);return obj
def cushion(x,y,z,w,d,h=.18):
    box((x,y,z),(w,d,h),'fabric',.07)
    curve([(x-w*.44,y-d*.44,z+h*.32),(x+w*.44,y-d*.44,z+h*.32),(x+w*.44,y+d*.44,z+h*.32),(x-w*.44,y+d*.44,z+h*.32)],.004,'seams',True)
def feet(w,d,top=.25,part='legs'):
    for x in [-1,1]:
        for y in [-1,1]:rod((x*(w/2-.07),y*(d/2-.07),.02),(x*(w/2-.11),y*(d/2-.11),top),.024,part,.035)
def sofa(w=2.1,d=.9,n=3,chaise=False,modular=False,corner=False):
    feet(w,d);box((0,0,.3),(w,d,.22),'fabric',.06)
    for i in range(n):
        x=-w/2+.16+(i+.5)*(w-.32)/n;cw=(w-.32)/n-.025
        cushion(x,-.04,.49,cw,d-.2)
        back=box((x,d/2-.13,.78),(cw,.23,.5),'fabric',.08,(-.12,0,0))
        for bx in [-.16,.16]:sphere((x+bx*cw,d/2-.255,.82),(.014,.009,.014),'buttons')
    if not modular:
        for x in [-1,1]:box((x*(w/2-.08),0,.56),(.16,d,.49),'fabric',.06)
    if chaise:
        box((-w/2+.48,-.72,.3),(.8,.75,.22),'fabric',.06);cushion(-w/2+.48,-.73,.49,.76,.72)
        for x in [-w/2+.15,-w/2+.8]:rod((x,-1.03,.02),(x,-1.03,.25),.03)
    if corner:
        box((w/2-.48,-.85,.3),(.86,.95,.22),'fabric',.06);cushion(w/2-.48,-.86,.49,.8,.9)
        box((w/2-.1,-.85,.77),(.2,.95,.55),'fabric',.05)
    if modular:
        for i in range(1,n):box((-w/2+i*w/n,-.41,.31),(.018,.015,.17),'metal',.003)
    for side in [-1,1]:box((side*w*.3,.14,.76),(.32,.12,.33),'accent',.06,(0,side*.12,side*.14))
def chair(kind):
    office=kind in ['Office chair','Gaming chair'];stool='stool' in kind.lower()
    seat=.76 if kind=='Bar stool' else .65 if stool else .46
    width=.53 if stool or kind=='Dining chair' else .72
    if office:
        for i in range(5):
            angle=i*math.tau/5;end=(math.cos(angle)*.34,math.sin(angle)*.34,.08)
            rod((0,0,.16),end,.025,'metal');sphere((end[0],end[1],.055),(.045,.025,.045),'metal')
        rod((0,0,.12),(0,0,seat),.045,'metal')
    else:feet(width,.6,seat-.07)
    cushion(0,0,seat,width,.58,.14)
    if not stool:
        h=.67 if kind in ['Gaming chair','Recliner'] else .46
        box((0,.23,seat+h/2),(width*.92,.14,h),'fabric',.07,(-.12,0,0))
        if kind=='Gaming chair':
            cushion(0,.13,seat+h*.8,width*.65,.15,.13)
            for x in [-1,1]:box((x*width*.43,.19,seat+.43),(.1,.17,.3),'accent',.03)
        if kind!='Dining chair':
            for x in [-1,1]:
                rod((x*width*.48,-.15,seat),(x*width*.48,-.15,seat+.23),.022,'metal' if office else 'legs')
                box((x*width*.48,-.02,seat+.26),(.085,.48,.09),'legs' if kind=='Accent chair' else 'fabric',.03)
    if stool:
        for x in [-1,1]:rod((x*width*.4,-.24,.3),(x*width*.4,.24,.3),.018,'metal')
    if kind=='Recliner':cushion(0,-.49,.35,.65,.42,.14)
    if kind=='Rocking chair':
        for x in [-width*.43,width*.43]:curve([(x,y,.025+.28*y*y)for y in [-.5,-.4,-.2,0,.2,.4,.5]],.032,'legs')
    return width,.65,seat+(.7 if kind=='Gaming chair' else .6)
manifest=[]
for index,name in enumerate(names):
    objects=[]
    slug='atelier-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
    w,d,h=2.1,.9,.99
    if index<=6:
        w=1.65 if index==1 else 2.4 if index in [2,3,4,5,6] else 2.1
        sofa(w,n=2 if index==1 else 3,chaise=index in [3,4],modular=index==5,corner=index==6)
        if index==3:
            box((.75,-.8,.28),(.65,.65,.22),'fabric',.06);cushion(.75,-.8,.45,.65,.65)
        if index in [3,4,6]:d=1.8
    elif name in ['Chaise lounge','Outdoor lounge chair','Daybed']:
        w,d,h=.8,1.9,.85;feet(w,d);box((0,0,.3),(w,d,.16),'legs',.02);cushion(0,0,.45,w-.04,d-.05)
        box((0,.78,.69),(w,.2,.5),'fabric',.07,(-.3,0,0))
        if name=='Daybed':
            w=1;box((-.43,0,.64),(.08,1.9,.4),'legs',.02)
        if name=='Outdoor lounge chair':
            for y in [-.8,-.6,-.4,-.2,0,.2,.4,.6]:box((0,y,.56),(.75,.075,.035),'legs',.008)
    elif name in ['Ottoman','Pouf','Footstool','Beanbag chair']:
        w=d=.8;h=.5
        if name=='Beanbag chair':sphere((0,0,.35),(.48,.48,.36));sphere((0,.18,.6),(.42,.27,.32));h=.92;w=d=1
        elif name=='Pouf':
            sphere((0,0,.24),(.42,.42,.24))
            for i in range(8):
                a=i*math.tau/8;curve([(math.cos(a)*.4,math.sin(a)*.4,.22),(math.cos(a)*.3,math.sin(a)*.3,.41),(0,0,.47)],.004)
        else:feet(w,d,.2);cushion(0,0,.32,w,d,.25)
        if name=='Footstool':
            for obj in objects:obj.location*=.7;obj.scale*=.7
    elif name in ['Bench','Window seat','Garden bench']:
        w,d,h=1.5,.5,.55;feet(w,d,.42)
        for i in range(5):box((0,-.2+i*.1,.43),(w,.08,.065),'legs',.012)
        if name!='Garden bench':cushion(0,0,.52,w-.04,d-.02,.13)
        if name=='Window seat':
            box((0,0,.24),(1.42,.43,.4),'legs',.025)
            for x in [-.35,.35]:
                box((x,-.23,.25),(.65,.03,.32),'legs',.015);rod((x-.08,-.26,.28),(x+.08,-.26,.28),.009,'metal')
        if name=='Garden bench':
            for z in [.65,.78,.91]:box((0,.22,z),(w,.04,.09),'legs',.01)
            for x in [-.65,.65]:rod((x,.22,.4),(x,.22,.96),.025)
            h=.96
    elif name=='Hanging chair':
        w,d,h=1.1,1.1,2.1
        curve([(-.5,0,.04),(.45,0,.04),(.5,0,.4),(.5,0,1.8),(.2,0,2.08),(0,0,2.08)],.035,'metal')
        rod((0,0,1.65),(0,0,2.08),.012,'metal');cushion(0,0,.6,.65,.6)
        for i in range(13):
            a=i*math.pi/12;curve([(.42*math.cos(a),.3*math.sin(a),.55),(.46*math.cos(a),.35*math.sin(a),1),(.22*math.cos(a),.18*math.sin(a),1.6)],.015,'legs')
    else:w,d,h=chair(name)
    # Apply modifiers and join by material slot: detailed silhouettes, few draw calls.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        bpy.ops.object.convert(target='MESH');obj.select_set(False)
    meshes=[]
    groups={part:[o for o in objects if o.data.materials and o.data.materials[0]==M[part]] for part in M}
    for part in M:
        group=groups[part]
        if not group:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group:obj.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1:bpy.ops.object.join()
        obj=bpy.context.object;obj.name=part
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        meshes.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    root=bpy.data.objects.new(slug,None);collection.objects.link(root)
    for obj in meshes:
        world=obj.matrix_world.copy();obj.parent=root;obj.matrix_world=world;obj.select_set(True)
    root.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{slug}.glb'),use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    for obj in meshes:obj.hide_render=True
    root.location.x=index*4
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c)for o in meshes for c in o.bound_box]
    w=max(p.x for p in points)-min(p.x for p in points);d=max(p.y for p in points)-min(p.y for p in points);h=max(p.z for p in points)-min(p.z for p in points)
    available={part:group for part,group in {'fabric':'fabric','legs':'wood','metal':'metal','accent':'fabric'}.items() if any(o.data.materials[0]==M[part] for o in meshes)}
    manifest.append({'id':slug,'name':name,'category':'Seating','placementType':'floor','family':'blender','modelSource':f'/furniture-v2/{slug}.glb','thumbnail':f'/thumbnails/{slug}.png','parts':available,'sizes':[{'id':'standard','label':'Standard','width':round(w,3),'depth':round(d,3),'height':round(h,3)}],'defaultSizeId':'standard'})
(SOURCE/'seating-manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'src'/'data'/'SeatingCatalog.js').write_text('// Generated by scripts/build_seating_collection.py; original designs.\nexport const SEATING_CATALOG = '+json.dumps(manifest,indent=2)+';\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'seating-collection.blend'))
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.render.resolution_x=320;scene.render.resolution_y=320;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
camdata=bpy.data.cameras.new('Seating preview');cam=bpy.data.objects.new('Seating preview',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO'
for entry in manifest:
    root=bpy.data.objects[entry['id']];meshes=list(root.children);bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c)for o in meshes for c in o.bound_box];lo=Vector(tuple(min(p[i]for p in points)for i in range(3)));hi=Vector(tuple(max(p[i]for p in points)for i in range(3)));center=(lo+hi)/2
    cam.location=center+Vector((2.2,-3,1.8)).normalized()*max((hi-lo).length,1)*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=max((hi-lo).length,1)*1.08
    for obj in meshes:obj.hide_render=False
    scene.render.filepath=str(THUMBS/f'{entry["id"]}.png');bpy.ops.render.render(write_still=True)
    for obj in meshes:obj.hide_render=True
print('SEATING COLLECTION COMPLETE: '+str(len(manifest)))
