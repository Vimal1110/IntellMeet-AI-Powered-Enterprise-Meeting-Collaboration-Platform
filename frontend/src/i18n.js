import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      features: "Features",
      about: "About",
      pricing: "Pricing",
      login: "Login",

      title: "AI Powered Meetings",

      subtitle:
        "Conduct smarter meetings with AI summaries, real-time collaboration and secure video conferencing.",

      createMeeting: "Create Meeting",
      joinMeeting: "Join Meeting",

      aboutTitle: "About IntelliMeet",
      pricingPlans: "Pricing Plans",

      basic: "Basic",
      free: "Free",
      getStarted: "Get Started",

      pro: "Pro",
      choosePlan: "Choose Plan",
      mostPopular: "Most Popular",

      enterprise: "Enterprise",
      contactSales: "Contact Sales",

      basic: "Basic",
        free: "Free",
        getStarted: "Get Started",
        mostPopular: "Most Popular",
        pro: "Pro",
        month: "/month",
        choosePlan: "Choose Plan",
        enterprise: "Enterprise",
        contactSales: "Contact Sales",

        fiveMeetings: "5 Meetings / Month",
        hdVideoCalls: "HD Video Calls",
        chatSupport: "Chat Support",

        unlimitedMeetings: "Unlimited Meetings",
        aiSummaries: "AI Summaries",
        recordings: "Recordings",
        teamCollaboration: "Team Collaboration",

        unlimitedUsers: "Unlimited Users",
        aiAnalytics: "AI Analytics",
        prioritySupport: "Priority Support",
        advancedSecurity: "Advanced Security",
    },
  },

  hi: {
    translation: {
      features: "विशेषताएँ",
      about: "हमारे बारे में",
      pricing: "मूल्य निर्धारण",
      login: "लॉगिन",

      title: "एआई संचालित मीटिंग्स",

      subtitle:
        "एआई सारांश, रियल-टाइम सहयोग और सुरक्षित वीडियो कॉन्फ्रेंसिंग के साथ बेहतर मीटिंग्स करें।",

      createMeeting: "मीटिंग बनाएँ",
      joinMeeting: "मीटिंग में शामिल हों",

      aboutTitle: "इंटेलीमीट के बारे में",
      pricingPlans: "मूल्य योजनाएँ",

      basic: "बेसिक",
      free: "मुफ्त",
      getStarted: "शुरू करें",

      pro: "प्रो",
      choosePlan: "प्लान चुनें",
      mostPopular: "सबसे लोकप्रिय",

      enterprise: "एंटरप्राइज़",
      contactSales: "सेल्स से संपर्क करें",

      basic: "बेसिक",
        free: "मुफ्त",
        getStarted: "शुरू करें",
        mostPopular: "सबसे लोकप्रिय",
        pro: "प्रो",
        month: "/माह",
        choosePlan: "प्लान चुनें",
        enterprise: "एंटरप्राइज़",
        contactSales: "सेल्स से संपर्क करें",

        fiveMeetings: "प्रति माह 5 मीटिंग्स",
        hdVideoCalls: "एचडी वीडियो कॉल्स",
        chatSupport: "चैट सहायता",

        unlimitedMeetings: "असीमित मीटिंग्स",
        aiSummaries: "एआई सारांश",
        recordings: "रिकॉर्डिंग्स",
        teamCollaboration: "टीम सहयोग",

        unlimitedUsers: "असीमित उपयोगकर्ता",
        aiAnalytics: "एआई विश्लेषण",
        prioritySupport: "प्राथमिक सहायता",
        advancedSecurity: "उन्नत सुरक्षा",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;