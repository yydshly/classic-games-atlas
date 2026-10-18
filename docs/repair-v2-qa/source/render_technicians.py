import bpy, math, os, sys
from mathutils import Vector
OUT=os.environ.get('REPAIR_ASSET_OUT','./repair-frame-sources')
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

skins=[(.63,.35,.20),(.86,.62,.39),(.45,.24,.15)]
coats=[(.16,.40,.38),(.46,.31,.17),(.22,.34,.47)]
for variant in range(3):
 for o in allobjs:bpy.data.objects.remove(o,do_unlink=True)
 allobjs=[];skin=mat('Skin'+str(variant),skins[variant]);coat=mat('Jacket'+str(variant),coats[variant]);apron=mat('Apron'+str(variant),(.67,.49,.25));hair=mat('Hair',(.11,.065,.035))
 legs=[];arms=[]
 for side in [-1,1]:
  group=[cube('Work boot',(side*.22,-.06,.15),(.33,.49,.25),dark,.08),cube('Trouser leg',(side*.21,0,.53),(.27,.30,.65),coat,.08)]
  legs.append((side,group))
 cube('Worker jacket',(0,0,1.2),(.76,.48,.8),coat,.20)
 cube('Canvas apron',(0,-.26,1.15),(.59,.065,.76),apron,.09)
 for side in [-1,1]:cube('Apron strap',(side*.21,-.267,1.59),(.09,.04,.28),cream,.025)
 cube('Pocket',(0,-.315,1.1),(.39,.045,.23),cream,.035)
 for x in [-.11,0,.11]:cube('Pocket tool',(x,-.35,1.20),(.035,.03,.2),metal,.008)
 for side in [-1,1]:
  group=[uv('Shoulder',(side*.43,0,1.4),(.18,.18,.22),coat),cube('Upper sleeve',(side*.49,0,1.23),(.23,.26,.34),coat,.1),uv('Forearm',(side*.52,-.04,1.01),(.105,.12,.24),skin),uv('Hand',(side*.53,-.065,.80),(.12,.12,.13),skin)]
  arms.append((side,group))
 cyl('Neck',(0,0,1.7),.14,.25,skin)
 uv('Head',(0,0,2.04),(.34,.29,.4),skin)
 for side in [-1,1]:uv('Ear',(side*.34,-.02,2.02),(.065,.07,.11),skin)
 uv('Nose',(0,-.28,2.04),(.07,.08,.08),skin)
 for x in [-.13,.13]:uv('Eye',(x,-.28,2.13),(.027,.025,.037),dark)
 cube('Smile',(0,-.286,1.94),(.11,.018,.02),dark,.009)
 if variant==1:
  uv('Hair top',(0,.04,2.36),(.35,.29,.12),hair);uv('Bun',(.23,.16,2.4),(.17,.15,.16),hair)
 else:
  cube('Work cap',(0,.02,2.41),(.73,.58,.18),coat,.09);cube('Cap brim',(0,-.31,2.34),(.73,.33,.06),cream,.03)
  cube('Cap badge',(0,-.29,2.43),(.14,.035,.07),gold,.02)
 # A real lifted arm pose is used during servicing; wrench effects touch the customer separately.
 base={o.name:o.location.copy() for o in allobjs}
 for frame in range(6):
  for o in allobjs:o.location=base[o.name].copy()
  amount=[0,.14,0,-.14,0,0][frame]
  for side,group in legs:
   for o in group:o.location=base[o.name]+Vector((0,side*amount,0))
  for side,group in arms:
   for o in group:o.location=base[o.name]+Vector((0,-side*amount*.5,0))
   if frame>=4 and side==1:
    for o in group[2:]:o.location=base[o.name]+Vector((.10,-.12,.32 if frame==4 else .22))
  scene.render.filepath=f'{OUT}/tech-{variant}-{frame}.png';bpy.ops.render.render(write_still=True)
print('TECH_ASSETS_DONE')
