export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'idea'
  category: string
  icon: 'layers' | 'code' | 'folder'
  iconColor?: 'default' | 'blue' | 'gray'
}