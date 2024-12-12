import React from "react";
import Navbar from "./Navbar";
import NewsStrip from "./NewsStrip";

interface LayoutProps {
    children: React.ReactNode;
    profileImageUrl?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, profileImageUrl }) => {
    return (
        <div className="min-h-screen">
            <Navbar profileImageUrl={profileImageUrl}/>
            <NewsStrip/>
            <main className="w-full mx-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;