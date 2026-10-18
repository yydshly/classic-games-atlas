import bpy,json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.resolution_x=256;s.render.resolution_y=320;s.render.resolution_percentage=100
bpy.ops.object.camera_add(location=(5,-10,6.1));c=bpy.context.object;c.rotation_euler=(Vector((0,0,1.35))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=3.8;s.camera=c;bpy.context.view_layer.update()
p=world_to_camera_view(s,c,Vector((0,0,0)));print('GROUND_ANCHOR',p.x*256,(1-p.y)*320, 'DRAW_Y',-(1-p.y)*130)
