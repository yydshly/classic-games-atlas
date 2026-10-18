import bpy, math, os, sys
from mathutils import Vector, Matrix
sys.path.insert(0,os.path.dirname(__file__))
from gait import leg_pose, DIRECTION_ANGLES
OUT=os.environ.get('REPAIR_ASSET_OUT','./repair-direction-frames')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=192;scene.cycles.use_denoising=False
scene.render.resolution_x=256;scene.render.resolution_y=320;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.5;scene.world.color=(.26,.30,.33)
scene.render.threads_mode='FIXED';scene.render.threads=6

def mat(n,c,metal=0,rough=.72,emit=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if emit:bs.inputs['Emission Color'].default_value=(*c,1);bs.inputs['Emission Strength'].default_value=emit
 return m
cream=mat('Warm porcelain',(.80,.75,.62),.04,.78);dark=mat('Graphite rubber',(.045,.073,.085),.25);metal=mat('Brushed steel',(.30,.37,.38),.15,.68);gold=mat('Brass trim',(.57,.36,.13),.12,.72);eye=mat('Warm luminous lens',(.54,1,.81),.02,.6,.25);leaf=mat('Leaf green',(.21,.47,.12));terra=mat('Terracotta',(.67,.25,.15));navy=mat('Glass screen',(.035,.095,.105),.08,.6)
allobjs=[]
def cube(n,loc,scale,m,b=.1):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b:mod=o.modifiers.new('Soft manufactured edge','BEVEL');mod.width=b;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 o.data.materials.append(m);allobjs.append(o);return o
def uv(n,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=bpy.context.object;o.name=n;o.scale=scale;o.data.materials.append(m);allobjs.append(o)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cyl(n,loc,r,depth,m,axis='z'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=n
 if axis=='y':o.rotation_euler.x=math.pi/2
 if axis=='x':o.rotation_euler.y=math.pi/2
 o.data.materials.append(m);mod=o.modifiers.new('Round rim','BEVEL');mod.width=.035;mod.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL');allobjs.append(o);return o

def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.3))-o.location).to_track_quat('-Z','Y').to_euler()
area((-4,-6,8),430,6);area((5,0,5),220,5);area((-2,5,4),310,5)
bpy.ops.object.camera_add(location=(5,-10,6.1));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.35))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.8;scene.camera=cam
colors={'courier':(.93,.46,.09),'gardener':(.16,.62,.48),'lantern':(.88,.33,.21),'musician':(.47,.38,.78)}
for typ,col in colors.items():
 for o in allobjs:bpy.data.objects.remove(o,do_unlink=True)
 allobjs=[];shell=mat(typ+' enamel',col,.06,.78)
 # Feet and flexible ankle mechanism, each mobile limb separately posed for walking.
 legs=[];arms=[]
 for side in [-1,1]:
  group=[]
  group.append(cube('Rubber boot',(side*.25,-.08,.16),(.38,.58,.25),dark,.09))
  group.append(cube('Foot shell',(side*.25,-.14,.26),(.38,.51,.19),cream,.07))
  group.append(cyl('Ankle',(side*.25,0,.43),.10,.23,metal))
  group.append(uv('Knee bearing',(side*.25,0,.60),(.15,.15,.14),gold))
  group.append(cyl('Leg sleeve',(side*.25,0,.77),.13,.28,cream))
  legs.append((side,group))
 cube('Main torso',(0,0,1.19),(.86,.59,.73),shell,.16)
 cube('Chest plate',(0,-.31,1.2),(.58,.09,.44),cream,.09)
 cube('Chest inset',(0,-.365,1.24),(.34,.026,.17),navy,.035)
 for x in [-.31,.31]:cyl('Chest rivet',(x,-.325,1.38),.026,.018,gold,'y')
 for x in [-.09,0,.09]:cube('Indicator',(x,-.39,1.24),(.04,.02,.07),eye,.012)
 if typ=='musician':
  for rr in [.18,.13,.08]:cyl('Speaker concentric',(0,-.385-rr*.07,1.14),rr,.035,metal if rr==.18 else dark,'y')
 if typ=='gardener':
  cyl('Back plant pot',(.38,.22,1.53),.22,.32,terra)
  for i in range(5):
   a=i*1.25;uv('Sprouting leaves',(.38+math.cos(a)*.16,.22+math.sin(a)*.12,1.83+(i%2)*.10),(.09,.055,.27),leaf).rotation_euler.y=math.cos(a)*.5
 for side in [-1,1]:
  group=[];group.append(uv('Shoulder bearing',(side*.48,0,1.42),(.15,.16,.15),metal))
  group.append(cube('Upper arm',(side*.56,0,1.20),(.21,.25,.35),shell,.07))
  group.append(uv('Elbow',(side*.58,-.015,1.01),(.12,.12,.12),gold))
  group.append(cube('Forearm',(side*.59,-.05,.87),(.20,.24,.26),cream,.06))
  group.append(cube('Grip',(side*.60,-.08,.69),(.22,.25,.16),dark,.04))
  for off in [-.065,.065]:group.append(cube('Fingers',(side*.60+off,-.15,.66),(.065,.12,.17),metal,.025))
  arms.append((side,group))
 cyl('Neck',(0,0,1.66),.14,.22,metal)
 head=cube('Rounded head',(0,0,2.03),(.98,.67,.65),shell,.18)
 cube('Face gasket',(0,-.345,2.05),(.82,.075,.44),cream,.13)
 cube('Display glass',(0,-.39,2.05),(.70,.05,.32),navy,.10)
 for x in [-.18,.18]:cube('Bright eye',(x,-.425,2.08),(.13,.018,.10),eye,.035)
 cube('Smile',(0,-.427,1.97),(.20,.018,.032),eye,.015)
 for side in [-1,1]:cyl('Ear hinge',(side*.51,0,2.05),.15,.12,metal,'x')
 if typ=='courier':
  cube('Courier cap',(0,.015,2.39),(.96,.66,.15),cream,.08);cube('Cap brim',(0,-.37,2.35),(.91,.35,.055),shell,.035)
  cube('Parcel bag',(.44,.30,1.1),(.34,.33,.47),terra,.07)
  cube('Delivery badge',(0,-.43,2.38),(.18,.03,.085),gold,.02)
 elif typ=='lantern':
  cube('Lantern crown',(0,0,2.39),(.63,.46,.11),cream,.06)
  cyl('Lantern beacon',(0,0,2.55),.15,.24,eye);cyl('Beacon cap',(0,0,2.70),.20,.05,gold)
 elif typ=='musician':
  for s in [-1,1]:cube('Headphone',(s*.57,0,2.08),(.18,.47,.42),cream,.10)
  cube('Headband',(0,.06,2.44),(.97,.19,.11),dark,.06)
 else:
  cyl('Antenna',(0,0,2.44),.045,.22,gold);uv('Leaf antenna',(.09,0,2.59),(.18,.04,.09),leaf).rotation_euler.y=-.3
 bpy.context.view_layer.update()
 # Rotate the entire 3D model, including all limb offsets, into four real world headings.
 # Camera ground azimuth is +26.565 degrees from model front (-Y).
 base={o.name:(o.location.copy(),o.rotation_euler.copy()) for o in allobjs}
 for direction,degrees in DIRECTION_ANGLES.items():
  turn=Matrix.Rotation(math.radians(degrees),4,'Z')
  for frame in range(4):
   for o in allobjs:
    o.location=base[o.name][0].copy();o.rotation_euler=base[o.name][1].copy()
   phase=frame*math.pi/2
   # During stance the foot moves backward relative to the torso; the returning forward foot lifts.
   for side,group in legs:
    stride,lift=leg_pose(frame,side,.325)
    for o in group:o.location=base[o.name][0]+Vector((0,stride,lift))
   for side,group in arms:
    a=phase+(math.pi if side<0 else 0)
    for o in group:o.location=base[o.name][0]+Vector((0,-math.sin(a)*.16,0))
   for o in allobjs:
    o.location=turn@o.location
    o.rotation_euler=(turn.to_3x3()@base[o.name][1].to_matrix()).to_euler()
   scene.render.filepath=f'{OUT}/robot-{typ}-{direction}-{frame}.png';bpy.ops.render.render(write_still=True)
print('DIRECTIONAL_ASSETS_DONE')
