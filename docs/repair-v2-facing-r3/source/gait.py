"""Shared authored motion recipe. Local forward is -Y; stance travels +Y and swing travels -Y."""
import math
DIRECTION_ANGLES={'down':26.565051,'right':116.565051,'up':206.565051,'left':-63.434949}
def leg_pose(frame, side, stride):
    phase=frame*math.pi/2+(math.pi if side<0 else 0)
    return math.sin(phase)*stride, max(0,-math.cos(phase))*.14
