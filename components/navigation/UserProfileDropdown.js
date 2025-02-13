// components/app/navigation/UserProfileDropdown.js

import { useAuth } from "@/context/AuthProvider";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

import Image from 'next/image';
import Link from 'next/link';

export default function UserProfileDropdown({ user, mobile, refs }) {
    const router = useRouter();
    const { signout } = useAuth();
    const [userDropdownRef, userProfileRef] = refs;

    useEffect(() => {
        const toggleDropdown = () => {
            if (mobile) return router.push(`/app/${user.username}`);
            if (userDropdownRef.current.classList.contains('hide')) {
                userDropdownRef.current.classList.remove('hide');
                userDropdownRef.current.classList.add('show');
            } else {
                userDropdownRef.current.classList.remove('show');
                userDropdownRef.current.classList.add('hide');
            }
        };

        userProfileRef.current?.addEventListener('click', toggleDropdown);

        return () => {
            userProfileRef.current?.removeEventListener('click', toggleDropdown);
        };
    }, []);

    const signOut = async ({ redirectTo }) => await signout(redirectTo);

    // if (mobile) {
    //     return (
    //         <Suspense fallback={<Loading />}>
    //             <Image className="user-profile" src={user.profileImgURL === null ? "https://firebasestorage.googleapis.com/v0/b/notespace-336ea.appspot.com/o/appInternals%2FNSSygnet%20-%20ZolteTlo.png?alt=media&token=29c41652-aeb5-4a96-b022-87ce584b6c96" : user.profileImgURL} alt="User profile picture" width={30} height={30} quality={100} loading='eager' />
    //         </Suspense>
    //     );
    // } else return (
    //     <div className="user-profile" ref={userProfileRef}>
    //         <span>{user.displayname}</span>
    //         <Suspense fallback={<Loading />}><Image src={user.profileImgURL === null ? "https://firebasestorage.googleapis.com/v0/b/notespace-336ea.appspot.com/o/appInternals%2FNSSygnet%20-%20ZolteTlo.png?alt=media&token=29c41652-aeb5-4a96-b022-87ce584b6c96" : user.profileImgURL} alt="User profile picture" width={30} height={30} quality={100} loading='eager' /></Suspense>


    //         <div className="user-dropdown hide" ref={userDropdownRef}>
    //             <ul>
    //                 <li><Link href={`/app/${user.username}`}><span>Pokaż profil</span><Image src="/assets/app/account_circle.svg" alt="Profile" width={24} height={24} quality={100} loading="eager" /></Link></li>
    //                 <li><Link href="/app/user/settings"><span>Ustawienia</span><Image src="/assets/app/settings.svg" alt="Settings" width={20} height={20} quality={100} loading="eager" /></Link></li>
    //                 <li><button type="button" onClick={() => signOut({ redirectTo: "/app" })}><span>Wyloguj się</span><Image src="/assets/app/signout.svg" alt="signout" width={24} height={24} quality={100} loading="eager" /></button></li>
    //             </ul>
    //         </div>
    //     </div>
    // );
}