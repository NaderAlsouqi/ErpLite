export interface TeamMember {
    teamId: number;
    nameAr: string;
    nameEn: string;
    positionAr: string;
    positionEn: string;
    bio: string;
    imageUrl: string;
    linkedInUrl: string;
    twitterUrl: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
  }
  
  export interface TeamMemberUpdate {
    nameAr: string;
    nameEn: string;
    positionAr: string;
    positionEn: string;
    bio?: string;
    image?: File;
    linkedInUrl?: string;
    twitterUrl?: string;
    sortOrder: number;
    isActive: boolean;
  }