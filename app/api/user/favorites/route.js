// app/api/user/favorites/route.js

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const favoriteFiles = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { favoritedFiles: true, favoritedFolders: true }
    });
    const validFiles = [];
    const validFolders = [];
    const orphanedFileIds = [];
    const orphanedFolderIds = [];
    for (const file of favoriteFiles.favoritedFiles) {
        try {
            validFiles.push(file);
        } catch (error) {
            orphanedFileIds.push(file.id);
        }
    }
    for (const folder of favoriteFiles.favoritedFolders) {
        try {
            validFolders.push(folder);
        } catch (error) {
            orphanedFolderIds.push(folder.id);
        }
    }
    if (orphanedFileIds.length > 0) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                favoritedFiles: {
                    disconnect: orphanedFileIds.map(id => ({ id }))
                }
            }
        });
    }

    if (orphanedFolderIds.length > 0) {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                favoritedFolders: {
                    disconnect: orphanedFolderIds.map(id => ({ id }))
                }
            }
        });
    }

    return NextResponse.json({
        success: true,
        files: validFiles.map(file => ({
            ...file,
            type: 'file',
            size: file.size ? file.size.toString() : null
        })),
        folders: validFolders.map(folder => ({
            ...folder,
            type: 'folder'
        }))
    }, { status: 200 });
}

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const body = await req.json();
    if (body.items && body.action) {
        const { items, action } = body;

        if (action === "add") {
            for (const item of items) {
                if (item.isFolder) {
                    const folder = await prisma.folder.findFirst({
                        where: {
                            path: item.path,
                            ownerId: session.user.id
                        }
                    });

                    if (folder) {
                        await prisma.user.update({
                            where: { id: session.user.id },
                            data: { favoritedFolders: { connect: { id: folder.id } } }
                        });
                    }
                } else {
                    const file = await prisma.file.findFirst({
                        where: {
                            path: item.path,
                            ownerId: session.user.id
                        }
                    });

                    if (file) {
                        await prisma.user.update({
                            where: { id: session.user.id },
                            data: { favoritedFiles: { connect: { id: file.id } } }
                        });
                    }
                }
            }
        } else if (action === "remove") {
            for (const item of items) {
                if (item.isFolder) {
                    let folder = await prisma.folder.findFirst({
                        where: {
                            path: item.path,
                            ownerId: session.user.id
                        }
                    });
                    if (!folder) {
                        folder = await prisma.folder.findFirst({
                            where: {
                                name: item.name,
                                ownerId: session.user.id
                            }
                        });
                    }

                    if (folder) {
                        await prisma.user.update({
                            where: { id: session.user.id },
                            data: { favoritedFolders: { disconnect: { id: folder.id } } }
                        });
                    } else {
                        const userWithFavorites = await prisma.user.findUnique({
                            where: { id: session.user.id },
                            include: { favoritedFolders: true }
                        });

                        const folderToRemove = userWithFavorites.favoritedFolders.find(f =>
                            f.name === item.name || f.path === item.path
                        );

                        if (folderToRemove) {
                            await prisma.user.update({
                                where: { id: session.user.id },
                                data: { favoritedFolders: { disconnect: { id: folderToRemove.id } } }
                            });
                        }
                    }
                } else {
                    let file = await prisma.file.findFirst({
                        where: {
                            path: item.path,
                            ownerId: session.user.id
                        }
                    });
                    if (!file) {
                        file = await prisma.file.findFirst({
                            where: {
                                name: item.name,
                                ownerId: session.user.id
                            }
                        });
                    }

                    if (file) {
                        await prisma.user.update({
                            where: { id: session.user.id },
                            data: { favoritedFiles: { disconnect: { id: file.id } } }
                        });
                    } else {
                        const userWithFavorites = await prisma.user.findUnique({
                            where: { id: session.user.id },
                            include: { favoritedFiles: true }
                        });

                        const fileToRemove = userWithFavorites.favoritedFiles.find(f =>
                            f.name === item.name || f.path === item.path
                        );

                        if (fileToRemove) {
                            await prisma.user.update({
                                where: { id: session.user.id },
                                data: { favoritedFiles: { disconnect: { id: fileToRemove.id } } }
                            });
                        }
                    }
                }
            }
        } else if (action === "update-path") {
            for (const item of items) {
                if (item.isFolder) {
                    const folder = await prisma.folder.findFirst({
                        where: {
                            path: item.oldPath,
                            ownerId: session.user.id
                        }
                    });

                    if (folder) {
                        await prisma.folder.update({
                            where: { id: folder.id },
                            data: {
                                path: item.newPath,
                                name: item.newName
                            }
                        });
                    }
                } else {
                    const file = await prisma.file.findFirst({
                        where: {
                            path: item.oldPath,
                            ownerId: session.user.id
                        }
                    });

                    if (file) {
                        await prisma.file.update({
                            where: { id: file.id },
                            data: {
                                path: item.newPath,
                                name: item.newName
                            }
                        });
                    }
                }
            }
        } else if (action === "cleanup-orphaned") {
            const allFavoriteFiles = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: { favoritedFiles: true, favoritedFolders: true }
            });

            const orphanedFileIds = [];
            const orphanedFolderIds = [];
            for (const file of allFavoriteFiles.favoritedFiles) {
                const exists = await prisma.file.findFirst({
                    where: {
                        id: file.id,
                        ownerId: session.user.id
                    }
                });

                if (!exists) {
                    orphanedFileIds.push(file.id);
                }
            }
            for (const folder of allFavoriteFiles.favoritedFolders) {
                const exists = await prisma.folder.findFirst({
                    where: {
                        id: folder.id,
                        ownerId: session.user.id
                    }
                });

                if (!exists) {
                    orphanedFolderIds.push(folder.id);
                }
            }
            if (orphanedFileIds.length > 0) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        favoritedFiles: {
                            disconnect: orphanedFileIds.map(id => ({ id }))
                        }
                    }
                });
            }

            if (orphanedFolderIds.length > 0) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: {
                        favoritedFolders: {
                            disconnect: orphanedFolderIds.map(id => ({ id }))
                        }
                    }
                });
            }

            return NextResponse.json({
                success: true,
                cleaned: orphanedFileIds.length + orphanedFolderIds.length,
                message: `Removed ${orphanedFileIds.length + orphanedFolderIds.length} orphaned favorites`
            }, { status: 200 });
        }

    return NextResponse.json({ success: true }, { status: 200 });
    }
    else {
        const { fileId, folderId, action } = body;
        if ((!fileId && !folderId) || !action)
            return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

        if (action === "add") {
            if (fileId) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { favoritedFiles: { connect: { id: fileId } } }
                });
            } else {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { favoritedFolders: { connect: { id: folderId } } }
                });
            }
        } else if (action === "remove") {
            if (fileId) {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { favoritedFiles: { disconnect: { id: fileId } } }
                });
            } else {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { favoritedFolders: { disconnect: { id: folderId } } }
                });
            }
        }

    return NextResponse.json({ success: true }, { status: 200 });
    }
}