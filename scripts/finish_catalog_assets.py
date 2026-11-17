"""Final production orientation and thumbnail optimization, after all asset batches."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(r'C:\Users\alnan\Desktop\projects\home designer');SOURCE=ROOT/'assets-source'/'furniture'
scene=bpy.context.scene
root=bpy.data.objects.get('atelier-skylight')
if root:
    for obj in scene.objects:obj.hide_render=True
    root.location=(0,0,0);root.rotation_euler.x=math.pi/2;bpy.context.view_layer.update()
    meshes=[obj for obj in root.children_recursive if obj.type=='MESH']
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    lo=Vector(tuple(min(p[i]for p in points)for i in range(3)));hi=Vector(tuple(max(p[i]for p in points)for i in range(3)));center=(lo+hi)/2
    root.location-=Vector((center.x,center.y,lo.z));bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for obj in root.children_recursive:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public'/'furniture-v2'/'atelier-skylight.glb'),use_selection=True,export_apply=True,export_draco_mesh_compression_enable=True)
    scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
    scene.render.resolution_x=240;scene.render.resolution_y=240;scene.render.resolution_percentage=100;scene.render.film_transparent=True
    data=bpy.data.cameras.new('Final preview');cam=bpy.data.objects.new('Final preview',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=2.1
    cam.location=(2,-3,2.5);cam.rotation_euler=(Vector((0,0,.05))-cam.location).to_track_quat('-Z','Y').to_euler()
    for obj in meshes:obj.hide_render=False
    scene.render.filepath=str(ROOT/'public'/'thumbnails'/'atelier-skylight.png');bpy.ops.render.render(write_still=True)
    # Source remains reproducible and separate from production assets.
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'outdoor-architecture-collection.blend'))
for path in (ROOT/'public'/'thumbnails').glob('atelier-*.png'):
    image=bpy.data.images.load(str(path),check_existing=False)
    image.scale(192,192);image.filepath_raw=str(path);image.file_format='PNG';image.save();bpy.data.images.remove(image)
print('CATALOG ASSETS FINALIZED')
