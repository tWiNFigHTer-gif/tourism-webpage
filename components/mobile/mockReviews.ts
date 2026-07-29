export interface ReviewData {
  id: string
  reviewer: {
    name: string
    avatarUrl: string
    verified: boolean
    role: string // e.g. "Govt. Forest Dept." or "Explorer"
  }
  location: {
    name: string
    district: string
    zone: string
  }
  rating: number // 1–5
  timeAgo: string
  text: string
  images: string[]
  videoThumb?: string
  likeCount: number
  commentCount: number
  isLiked: boolean
  isSaved: boolean
}

export const MOCK_REVIEWS: ReviewData[] = [
  {
    id: "rev-001",
    reviewer: {
      name: "Dept. of Ecospaces",
      avatarUrl:
        "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=80&q=80",
      verified: true,
      role: "ZONE 04 • 2H AGO",
    },
    location: {
      name: "Bioluminescent Trail, Periyar",
      district: "Idukki",
      zone: "ZONE 04",
    },
    rating: 5,
    timeAgo: "2h ago",
    text: "Visual update from the Bioluminescent Trail in Periyar. Recent atmospheric moisture has increased the intensity of the mycelium glow. Limited capacity tonight for safety — book your slot early.",
    images: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 1200,
    commentCount: 84,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "rev-002",
    reviewer: {
      name: "Coastal Monitoring",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
      verified: true,
      role: "ALAPPUZHA • 5H AGO",
    },
    location: {
      name: "Alleppey Backwaters",
      district: "Alappuzha",
      zone: "ZONE 12",
    },
    rating: 4,
    timeAgo: "5h ago",
    text: "New sanctuary protocols are now active for the backwater channels. Please observe the Silent Zone markers for migratory birds along the eastern stretch. Boat traffic is being rerouted.",
    images: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 856,
    commentCount: 32,
    isLiked: true,
    isSaved: true,
  },
  {
    id: "rev-003",
    reviewer: {
      name: "Riya Menon",
      avatarUrl:
        "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=80&q=80",
      verified: false,
      role: "WAYANAD • 1D AGO",
    },
    location: {
      name: "Chembra Peak",
      district: "Wayanad",
      zone: "ZONE WYD-2",
    },
    rating: 5,
    timeAgo: "1d ago",
    text: "The heart-shaped lake at the summit is absolutely otherworldly at dawn. Mist rolling over the ghats, near-zero crowd density at 6 AM. This is what Kerala hides from guidebooks. Highly recommend the forest-officer guide — real expertise.",
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 2400,
    commentCount: 156,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "rev-004",
    reviewer: {
      name: "Arjun Krishnan",
      avatarUrl:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
      verified: false,
      role: "KOZHIKODE • 2D AGO",
    },
    location: {
      name: "Sarovaram Eco Park",
      district: "Kozhikode",
      zone: "ZONE CLT-1",
    },
    rating: 4,
    timeAgo: "2d ago",
    text: "The wooden boardwalk through the mangroves is exceptionally maintained. Spotted 12 species of kingfishers in under two hours. Capacity tracking app worked perfectly — knew exactly when to arrive. The butterfly park is a bonus.",
    images: [
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 943,
    commentCount: 41,
    isLiked: true,
    isSaved: false,
  },
  {
    id: "rev-005",
    reviewer: {
      name: "Wildlife Watch Kerala",
      avatarUrl:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80",
      verified: true,
      role: "THRISSUR • 3D AGO",
    },
    location: {
      name: "Athirappilly Waterfalls",
      district: "Thrissur",
      zone: "ZONE THR-5",
    },
    rating: 5,
    timeAgo: "3d ago",
    text: "Post-monsoon the falls are at full volume — 80 feet of pure cascade. The viewing platform on the eastern bank gives you the full face. Morning golden hour between 6:30–7:15 AM is the window. Capacity is restricted to 200 visitors today.",
    images: [
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 3100,
    commentCount: 218,
    isLiked: false,
    isSaved: true,
  },
  {
    id: "rev-006",
    reviewer: {
      name: "Priya Nair",
      avatarUrl:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&q=80",
      verified: false,
      role: "MUNNAR • 4D AGO",
    },
    location: {
      name: "Eravikulam National Park",
      district: "Idukki",
      zone: "ZONE IDK-3",
    },
    rating: 5,
    timeAgo: "4d ago",
    text: "Neelakurinji in full bloom — the hillsides are entirely violet. This bloom only happens every 12 years. The park has done an outstanding job managing visitor flow. The viewing corridors are well-marked and the shuttle system is efficient.",
    images: [
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 5700,
    commentCount: 412,
    isLiked: true,
    isSaved: true,
  },
  {
    id: "rev-007",
    reviewer: {
      name: "Forest Dept. Wayanad",
      avatarUrl:
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=80&q=80",
      verified: true,
      role: "WAYANAD • 5D AGO",
    },
    location: {
      name: "Nagarhole Wildlife Sanctuary",
      district: "Wayanad",
      zone: "ZONE WYD-6",
    },
    rating: 4,
    timeAgo: "5d ago",
    text: "Elephant corridor camera traps have captured a new herd of 14 crossing the zone boundary. Safari jeep slots are now open for Tuesday–Friday. Please maintain absolute silence beyond marker 7 on the northern track.",
    images: [
      "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 1870,
    commentCount: 97,
    isLiked: false,
    isSaved: false,
  },
  {
    id: "rev-008",
    reviewer: {
      name: "Meera Thomas",
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80",
      verified: false,
      role: "PALAKKAD • 6D AGO",
    },
    location: {
      name: "Silent Valley National Park",
      district: "Palakkad",
      zone: "ZONE PKD-1",
    },
    rating: 5,
    timeAgo: "6d ago",
    text: "The last remaining tropical rain forest of the Western Ghats in Kerala — and it lives up to every superlative. Lion-tailed macaques seen within 10 metres of the trail. Absolutely no connectivity inside, which is a feature, not a bug. Pure immersion.",
    images: [
      "https://images.unsplash.com/photo-1511497584788-876761465586?auto=format&fit=crop&w=800&q=80",
    ],
    likeCount: 4200,
    commentCount: 334,
    isLiked: false,
    isSaved: false,
  },
]
