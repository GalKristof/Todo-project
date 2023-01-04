export interface ToDo {
    id: number;
    title: string;
    description: string;
    status: 'Nincs elkezdve' | 'Folyamatban' | 'Kész' | 'Archivált';
    priority: 'Alacsony' | 'Normál' | 'Sürgős';
    createdAt: Date;
    modifiedAt: Date;
    deadline: Date;
}