"""Run inside Blender to rebuild the architectural opening collection."""
import bpy
from pathlib import Path
ROOT = Path(r'C:\Users\alnan\Desktop\projects\home designer')
for previous in list(bpy.data.collections):
    if previous.name.startswith('Home Designer Openings'):
        for obj in list(previous.all_objects): bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(previous)
collection = bpy.data.collections.new('Home Designer Openings')
bpy.context.scene.collection.children.link(collection)
def material(name, color, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .28 if metal else .48
    return m
oak = material('Natural oak', (.49,.29,.13))
white = material('Painted ivory', (.86,.84,.78))
dark = material('Anthracite', (.055,.065,.075), .4)
brass = material('Brushed brass', (.66,.43,.15), .8)
glass = material('Architectural glass', (.38,.65,.74), .2)
glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value = .65
def empty(name, parent=None):
    o = bpy.data.objects.new(name, None); collection.objects.link(o); o.parent = parent; return o
def box(name, location, size, mat, parent):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object; o.name = name
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o); o.parent = parent; o.location = location; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    bevel = o.modifiers.new('Soft manufactured edges', 'BEVEL'); bevel.width=.006; bevel.segments=3
    o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return o
catalog = [('door-single',1,2.1,oak),('door-double',1.8,2.1,white),('door-sliding',1.8,2.1,dark),('door-dark',1,2.1,dark),('window-standard',1.2,1.2,white),('window-wide',2,1.2,dark),('window-tall',1,1.8,oak),('window-double',1.8,1.3,white)]
catalog += [('door-flush',.9,2.1,white),('door-shaker',1,2.1,oak),('door-french',1.8,2.1,white),('door-glazed',1,2.1,dark),('door-sliding-grid',1.8,2.1,white),('door-panelled',1,2.1,oak),('window-picture',1.6,1.3,dark),('window-grid',1.5,1.3,white),('window-transom',1.8,.5,dark),('window-square',1,1,oak),('window-triptych',2.4,1.3,dark),('window-cottage',1.2,1.4,white)]
for index,(name,w,h,finish) in enumerate(catalog):
    root=empty(name)
    for x in [-w/2+.035,w/2-.035]:
        box('Jamb',(x,0,h/2),(.07,.16,h),finish,root)
        for y in [-.095,.095]: box('Architrave',(x,y,h/2),(.10,.025,h+.06),finish,root)
    box('Lintel',(0,0,h-.035),(w,.16,.07),finish,root)
    if name.startswith('window'):
        box('Sill',(0,0,.025),(w+.12,.24,.05),finish,root)
        box('Glazing',(0,0,h/2),(w-.14,.018,h-.14),glass,root)
        if name not in ['window-picture','window-transom']:
            columns=3 if name=='window-triptych' else 2
            for column in range(1,columns): box('Mullion',(-w/2+w*column/columns,0,h/2),(.045,.09,h-.1),finish,root)
        if name in ['window-grid','window-cottage','window-double','window-standard']:
            for level in ([.33,.66] if name=='window-grid' else [.65]): box('Transom',(0,0,h*level),(w-.1,.09,.035),finish,root)
        box('Latch',( .055,-.07,h*.45),(.02,.035,.12),brass,root)
    else:
        sliding='sliding' in name
        count=2 if name in ['door-double','door-french'] or sliding else 1
        if sliding:
            for z in [.025,h-.035]: box('Twin track',(0,0,z),(w-.08,.20,.035),dark,root)
        leaf_w=(w-.15)/count
        for j in range(count):
            hinge=empty('Leaf_'+str(j),root)
            hinge.location=(-w/2+.075+j*leaf_w,0,0)
            if sliding:
                hinge.name='Slide_active' if j==0 else 'Slide_fixed'
                hinge.location.y=-.04 if j==0 else .04
            elif count==2 and j==1:
                hinge.name='Leaf_right'
                hinge.location.x=w/2-.075
                hinge.scale.x=-1
            glazed=sliding or name in ['door-french','door-glazed']
            if glazed:
                for x in [.035,leaf_w-.035]: box('Stile',(x,0,h/2),(.07,.045,h-.09),finish,hinge)
                for z in [.06,h-.10]: box('Rail',(leaf_w/2,0,z),(leaf_w,.045,.09),finish,hinge)
                box('Door glazing',(leaf_w/2,0,h/2),(leaf_w-.14,.016,h-.25),glass,hinge)
                if name in ['door-french','door-sliding-grid']:
                    box('Glazing bar',(leaf_w/2,0,h/2),(.025,.035,h-.25),finish,hinge)
                    for z in [h/3,2*h/3]: box('Glazing bar',(leaf_w/2,0,z),(leaf_w-.14,.035,.025),finish,hinge)
            else:
                box('Door leaf',(leaf_w/2,0,(h-.085)/2+.01),(leaf_w-.008,.045,h-.085),finish,hinge)
                if name!='door-flush':
                    levels=[h*.22,h*.5,h*.78] if name=='door-panelled' else [h*.28,h*.72]
                    for z in levels: box('Raised panel',(leaf_w/2,-.026,z),(leaf_w-.17,.018,h*(.23 if name=='door-panelled' else .32)),finish,hinge)
            for y in [-.05,.05]:
                if sliding:
                    box('Pull mount',(leaf_w-.10,y,1.02),(.04,.025,.24),dark,hinge)
                    box('Sliding pull',(leaf_w-.10,y*1.5,1.02),(.025,.03,.20),brass,hinge)
                else:
                    box('Handle rose',(leaf_w-.10,y,1.02),(.055,.025,.055),brass,hinge)
                    box('Lever handle',(leaf_w-.15,y*1.35,1.02),(.14,.025,.022),brass,hinge)
            if not sliding:
                for z in [.25,h/2,h-.25]: box('Hinge',(0,0,z),(.025,.065,.09),brass,hinge)
            if count==2 and not sliding and j==1:
                # Bake the right leaf mirror into geometry, keeping a clean hinge transform.
                hinge.scale.x=1
                for child in hinge.children:
                    child.location.x *= -1
                    for vertex in child.data.vertices: vertex.co.x *= -1
                    for polygon in child.data.polygons: polygon.flip()
    root.location.x=index*3
bpy.ops.object.select_all(action='DESELECT')
for o in collection.all_objects: o.select_set(True)
(ROOT/'public'/'openings').mkdir(parents=True,exist_ok=True)
for root in [o for o in collection.objects if o.parent is None]:
    bpy.ops.object.select_all(action='DESELECT')
    root.location.x=0
    root.select_set(True)
    for o in root.children_recursive: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public'/'openings'/f'{root.name}.glb'),use_selection=True,export_apply=True)
    root.location.x=catalog.index(next(c for c in catalog if c[0]==root.name))*3
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public'/'openings'/'collection.blend'))
