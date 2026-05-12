export interface Template {
    id: string;
    title: string;
    tags: string[];
    image: string;
    manifest: string;
    category_id?: string;
    category_name?: string;
  }
  
  export interface CategoryIndex {
    category_id: string;
    category_name: string;
    version: string;
    updated_at: string;
    templates: Template[];
  }
  
  export interface Category {
    id: string;
    name: string;
    index_path: string;
  }
  
  export interface RootIndex {
    version: string;
    updated_at: string;
    base_url: string;
    categories: Category[];
  }
  
  export interface SearchResult {
    exact: Template | null;
    similar: Template[];
  }