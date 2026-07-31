import React, { useState, useEffect } from 'react'
import Footer from '../components/Footer'

export default function TOSandPP() {
    const [activeTab, setActiveTab] = useState('tos')


    useEffect(() => {
        const hash = window.location.hash.replace('#', '')

        if (hash === "pp") {
            setActiveTab('pp')
        } else {
            setActiveTab("tos")
        }
    }, []);

    const changeTab = (tab) => {
        setActiveTab(tab)
        window.location.hash = tab
    }
    return (
        <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center px-4 py-10">

                {/* Buttons */}
                <div className="flex gap-4 mb-8" role="tablist" aria-label="Legal documents">
                    <button
                        onClick={() => changeTab('tos')}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'tos'}
                        aria-controls="terms-panel"
                        className={`px-5 py-3 rounded-md font-semibold transition-colors ${
                            activeTab === 'tos'
                                ? 'bg-blue-500'
                                : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                    >
                        Terms of Service
                    </button>

                    <button
                        onClick={() => changeTab('pp')}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'pp'}
                        aria-controls="privacy-panel"
                        className={`px-5 py-3 rounded-md font-semibold transition-colors ${
                            activeTab === 'pp'
                                ? 'bg-blue-500'
                                : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                    >
                        Privacy Policy
                    </button>
                </div>

                {/* Content Box */}
                <div className="bg-[#0f2650] border border-white/10 rounded-xl shadow-lg w-full max-w-6xl p-8">

                    {activeTab === 'pp' && (
                        <div className="space-y-6" id="privacy-panel" role="tabpanel">

                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    Privacy Policy
                                </h1>

                                <p className="text-white/80">
                                    BarnBuddy respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you use our website and services.
                                </p>
                                <p className="mt-2 text-sm text-white/60">Last updated: July 31, 2026</p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    1. Information We Collect
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>Account Information: Name, email, and login credentials.</li>
                                    <li>Animal Data: Information you choose to store about your animals.</li>
                                    <li>Uploaded Files: Photos, imports, and transfer-help files you choose to submit.</li>
                                    <li>Usage Data: Basic information about how you use the website.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    2. How We Use Information
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>To provide and improve the BarnBuddy platform.</li>
                                    <li>To personalize your experience.</li>
                                    <li>To communicate updates and reminders.</li>
                                    <li>To ensure security and prevent misuse.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    3. How We Protect Information
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>Data is stored securely in our database.</li>
                                    <li>Access is limited to authorized users only.</li>
                                    <li>We take reasonable security measures.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    4. Sharing of Information
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>We do not sell your information.</li>
                                    <li>We use providers for authentication (Clerk), hosting and databases, object storage (Cloudflare R2), email delivery (Resend), and optional AI-assisted imports (OpenAI).</li>
                                    <li>We may share information if required by law.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    5. AI-Assisted Imports
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>When you choose AI extraction, the selected file and your notes are sent to OpenAI to draft animal records.</li>
                                    <li>BarnBuddy stores the extracted result and request metadata. The original AI extraction file is not saved by BarnBuddy.</li>
                                    <li>Files attached to a transfer-help request may be stored so the request can be handled.</li>
                                    <li>Remove unrelated personal or sensitive information before uploading a file.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    6. Retention and Deletion
                                </h2>

                                <p className="text-white/80">
                                    We keep account and livestock records while your account is active or as needed to provide the service. Deleting your account removes linked BarnBuddy database records and private uploaded animal images. Limited records may be retained when required for security, fraud prevention, legal obligations, or backups.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    7. User Choices
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>You can update or delete your account information.</li>
                                    <li>You can manage product emails from account settings.</li>
                                    <li>You may contact us to request a copy or correction of your stored data.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    8. Children’s Privacy
                                </h2>

                                <p className="text-white/80">
                                    BarnBuddy is not intended for children under 13, and children under 13 should not create an account or submit personal information. A parent or guardian who believes a child provided personal information can contact us to request its deletion.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    9. Updates to This Policy
                                </h2>

                                <p className="text-white/80">
                                    We may update this Privacy Policy from time to time.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    10. Contact Us
                                </h2>

                                <p className="text-white/80">
                                    barnbuddyapp@gmail.com
                                </p>
                            </div>

                        </div>
                    )}

                    {activeTab === 'tos' && (
                        <div className="space-y-6" id="terms-panel" role="tabpanel">

                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    Terms of Service
                                </h1>

                                <p className="text-white/80">
                                    Welcome to BarnBuddy! These Terms govern your use of the platform.
                                </p>
                                <p className="mt-2 text-sm text-white/60">Last updated: July 31, 2026</p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    1. Use of Services
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>BarnBuddy is intended for farmers, students, and agricultural organizations.</li>
                                    <li>You agree to use BarnBuddy lawfully.</li>
                                    <li>You are responsible for uploaded information.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    2. Accounts
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>You may need an account to use certain features.</li>
                                    <li>You agree to provide accurate information.</li>
                                    <li>You are responsible for account security.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    3. Content You Provide
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>You may upload records and notes.</li>
                                    <li>You keep ownership of your content.</li>
                                    <li>We may process data so the service functions properly.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    4. Payments
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>Some features may require payment.</li>
                                    <li>Payment terms will be shown before purchase.</li>
                                    <li>Fees are non-refundable unless required by law.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    5. Acceptable Use
                                </h2>

                                <ul className="list-disc pl-6 space-y-2 text-white/80">
                                    <li>No hacking or malware.</li>
                                    <li>No harmful or false content.</li>
                                    <li>No violating laws while using BarnBuddy.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    6. Livestock and Veterinary Disclaimer
                                </h2>

                                <p className="text-white/80">
                                    BarnBuddy is a record-keeping tool, not veterinary advice or an emergency service. Verify dates, reminders, dosages, and imported information, and consult a qualified veterinarian for animal-health decisions.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    7. Service Availability
                                </h2>

                                <p className="text-white/80">
                                    BarnBuddy may update or pause features at any time. Keep copies of records you cannot afford to lose and do not rely on reminders as your only care schedule.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    8. Limitation of Liability
                                </h2>

                                <p className="text-white/80">
                                    BarnBuddy is provided “as is” without warranties.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    9. Termination
                                </h2>

                                <p className="text-white/80">
                                    We may suspend accounts that violate these Terms.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    10. Changes to These Terms
                                </h2>

                                <p className="text-white/80">
                                    We may update these Terms periodically.
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    11. Contact Us
                                </h2>

                                <p className="text-white/80">
                                    barnbuddyapp@gmail.com
                                </p>
                            </div>

                        </div>
                    )}

                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    )
}
