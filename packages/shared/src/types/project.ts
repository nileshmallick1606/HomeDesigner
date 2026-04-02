export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum RoomType {
  BATHROOM = 'BATHROOM',
  KITCHEN = 'KITCHEN',
  BEDROOM = 'BEDROOM',
  LIVING_ROOM = 'LIVING_ROOM',
  DINING_ROOM = 'DINING_ROOM',
  BALCONY = 'BALCONY',
  UTILITY = 'UTILITY',
  CUSTOM = 'CUSTOM',
}

export interface ProjectDto {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  overallBudget?: number;
  timelineStart?: string;
  timelineEnd?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDto {
  id: string;
  projectId: string;
  name: string;
  type: RoomType;
  budget?: number;
  notes?: string;
  sortOrder: number;
  _count?: {
    photos: number;
    designs: number;
  };
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  [RoomType.BATHROOM]: 'Bathroom',
  [RoomType.KITCHEN]: 'Kitchen',
  [RoomType.BEDROOM]: 'Bedroom',
  [RoomType.LIVING_ROOM]: 'Living Room',
  [RoomType.DINING_ROOM]: 'Dining Room',
  [RoomType.BALCONY]: 'Balcony',
  [RoomType.UTILITY]: 'Utility',
  [RoomType.CUSTOM]: 'Custom',
};
