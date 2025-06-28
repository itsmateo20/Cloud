// app/page.js
"use client";

import { useAuth } from "@/context/AuthProvider";
import { io } from "socket.io-client";

import Layout from "@/components/Layout";
import main from "@/public/styles/main.module.css";

import { useEffect, useState } from "react";

import { Resizable } from "re-resizable";
import Image from "next/image";
import { FolderTree } from "@/components/app/FolderTree";
import { FileList } from "@/components/app/FileList";

let socket;

export default function Page() {
  const { user, loading } = useAuth();

  const [isMobile, setIsMobile] = useState(null);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let mobile = window.matchMedia("(max-width: 1023px)");
      setIsMobile(mobile.matches);

      const handleResize = () => setIsMobile(window.matchMedia("(max-width: 1023px)").matches);
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (!socket) socket = io();

    const handlePopState = (event) => {
      if (event.state && event.state.folderPath !== undefined) {
        setCurrentPath(event.state.folderPath);
      }
    };

    window.addEventListener("popstate", handlePopState);

    if (window.history.state === null) {
      window.history.replaceState({ folderPath: "" }, "", window.location.href);
    }

    return () => {
      socket?.off("folder-structure-updated");
      socket?.off("file-updated");
      socket = null;

      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigateToFolder = (folderPath) => {
    if (folderPath === currentPath) return;

    setCurrentPath(folderPath);

    window.history.pushState(
      { folderPath },
      "",
      window.location.pathname + window.location.search
    );
  };

  const handleFolderSelect = (folderPath) => {
    navigateToFolder(folderPath);
  };

  const handleFolderDoubleClick = (folderPath) => {
    navigateToFolder(folderPath);
  };

  if (!user) return null;

  return (
    <Layout mainStyle={main.main} loading={loading} mobile={isMobile} user={user}>
      {/* <div className={main.controls} >

      </div> */}
      <div className={main.diskContainerRow}>
        <Resizable
          defaultSize={{ width: 300, height: "100%" }}
          minWidth={200}
          maxWidth={500}
          minHeight="100%"
          maxHeight="100%"
          enable={{
            top: false,
            right: true,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false
          }}
        >
          <div className={main.folderStructureSidebar}>
            <Image
              src="/assets/app/corner.svg"
              alt="corner"
              width={30}
              height={30}
              loading="eager"
              className={main.corner}
            />
            <FolderTree
              socket={socket}
              onFolderSelect={handleFolderSelect}
              selectedPath={currentPath}
            />
          </div>
        </Resizable>
        <FileList
          socket={socket}
          currentPath={currentPath}
          onFolderDoubleClick={handleFolderDoubleClick}
        />
      </div>
    </Layout>
  );
}