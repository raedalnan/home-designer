"""Render catalog thumbnails from the same GLB geometry used in the app."""
import bpy, re, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer')
out=ROOT/'public'/'thumbnails';out.mkdir(exist_ok=True)
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.display.shading.background_type='WORLD'
for obj in scene.objects: obj.hide_render=True
camera_data=bpy.data.cameras.new('Thumbnail camera');camera=bpy.data.objects.new('Thumbnail camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='ORTHO'
def render(objects,name):
    meshes=[obj for obj in objects if obj.type=='MESH']
    if not meshes:return
    for obj in objects:obj.hide_render=False
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(low+high)/2;size=high-low
    camera.location=center+Vector((1.8,-3,1.6)).normalized()*max(size.length,1)*2
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=max(size.length,1)*1.12
    scene.render.filepath=str(out/f'{name}.png');bpy.ops.render.render(write_still=True)
    for obj in objects:obj.hide_render=True
for path in (ROOT/'public'/'openings').glob('*.glb'):
    before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(scene.objects)-before)
    render(objects,path.stem)
    for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)
before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/'furniture.glb'));furniture=list(set(scene.objects)-before)
for obj in furniture:obj.hide_render=True
names=re.findall(r'entry\("([^"]+)"',(ROOT/'src'/'data'/'FurnitureCatalog.js').read_text())
for name in names:
    obj=next((o for o in furniture if o.name==name),None)
    if obj:render([obj,*obj.children_recursive],name)
print('THUMBNAILS COMPLETE')
