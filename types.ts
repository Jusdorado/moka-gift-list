export interface Product {
    id: string;
    name: string;
    price?: string;
    url: string;
    image?: string;
    size?: string;
    description?: string;
    author?: string;
    color?: string;
    category: string;
    categoryColor: string;
    categoryEmoji: string;
}

export interface Category {
    id: string;
    name: string;
    emoji: string;
    color: string;
}

export interface PurchasedState {
    [productId: string]: boolean;
}
