import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startTour = () => {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        steps: [
            {
                element: '#neural-map-link',
                popover: {
                    title: 'The Neural Map',
                    description: 'This is your knowledge graph. It shows what you know and what you need to learn. Start here to find new quests.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#quests-link',
                popover: {
                    title: 'Active Quests',
                    description: 'Manage your ongoing learning missions here.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#profile-link',
                popover: {
                    title: 'Operative Profile',
                    description: 'Track your XP, level, and stats. Prove your mastery to rank up.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#user-menu',
                popover: {
                    title: 'Settings',
                    description: 'Manage your account and preferences here.',
                    side: "left",
                    align: 'start'
                }
            }
        ]
    });

    driverObj.drive();
};
