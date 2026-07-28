// client/src/components/BioDataSetup.jsx
import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Users,
} from "lucide-react";
import axios from "axios";

const BioDataSetup =
  () => {
    const navigate =
      useNavigate();

    // Form State
    const [
      username,
      setUsername,
    ] =
      useState(
        "",
      );
    const [
      email,
      setEmail,
    ] =
      useState(
        "",
      );
    const [
      phone,
      setPhone,
    ] =
      useState(
        "",
      );
    const [
      gender,
      setGender,
    ] =
      useState(
        "",
      );
    const [
      country,
      setCountry,
    ] =
      useState(
        "Nigeria",
      );
    const [
      referredBy,
      setReferredBy,
    ] =
      useState(
        "",
      );

    // Checkbox State
    const [
      willingNsfw,
      setWillingNsfw,
    ] =
      useState(
        false,
      );
    const [
      agreedTerms,
      setAgreedTerms,
    ] =
      useState(
        false,
      );
    const [
      confirmedAge,
      setConfirmedAge,
    ] =
      useState(
        false,
      );
    const [
      subscribeEmails,
      setSubscribeEmails,
    ] =
      useState(
        false,
      );

    const [
      loading,
      setLoading,
    ] =
      useState(
        false,
      );

    // Strict Validation: Required fields and mandatory legal checkboxes
    const isFormValid =
      username.trim() !==
        "" &&
      email.trim() !==
        "" &&
      phone.trim() !==
        "" &&
      gender !==
        "" &&
      country.trim() !==
        "" &&
      agreedTerms &&
      confirmedAge;

    const handleSubmit =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !isFormValid
        )
          return;

        setLoading(
          true,
        );

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );

          // Update the user in MongoDB
          await axios.put(
            "http://localhost:5000/api/users/profile",
            {
              username,
              email,
              phone,
              gender,
              country,
              referredBy,
              willingNsfw,
              agreedTerms,
              confirmedAge,
              subscribeEmails,
              hasCompletedBioData: true,
            },
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

          // Successfully saved bio data, now route them to Didit KYC
          navigate(
            "/auth/creator/kyc",
          );
        } catch (error) {
          console.error(
            error,
          );
          alert(
            "Failed to save bio data. Please try again.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200 py-12">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-2">
            Complete
            Your
            Profile
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Before
            we
            verify
            your
            identity,
            we
            need
            a
            few
            details
            to
            set
            up
            your
            creator
            account
            securely.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                  *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={
                      username
                    }
                    onChange={(
                      e,
                    ) =>
                      setUsername(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#FF5757]"
                    placeholder="e.g. CreatorName"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                  Address
                  *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={
                      email
                    }
                    onChange={(
                      e,
                    ) =>
                      setEmail(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#FF5757]"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone
                  Number
                  *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="tel"
                    required
                    value={
                      phone
                    }
                    onChange={(
                      e,
                    ) =>
                      setPhone(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#FF5757]"
                    placeholder="+234..."
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Gender
                  *
                </label>
                <select
                  required
                  value={
                    gender
                  }
                  onChange={(
                    e,
                  ) =>
                    setGender(
                      e
                        .target
                        .value,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-[#FF5757] appearance-none"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select...
                  </option>
                  <option value="male">
                    Male
                  </option>
                  <option value="female">
                    Female
                  </option>
                  <option value="non-binary">
                    Non-binary
                  </option>
                  <option value="prefer-not-to-say">
                    Prefer
                    not
                    to
                    say
                  </option>
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Country
                  *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={
                      country
                    }
                    onChange={(
                      e,
                    ) =>
                      setCountry(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#FF5757]"
                    placeholder="Nigeria"
                  />
                </div>
              </div>

              {/* Referred By */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Referred
                  By
                  (optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    value={
                      referredBy
                    }
                    onChange={(
                      e,
                    ) =>
                      setReferredBy(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-[#FF5757]"
                    placeholder="Referral code or username"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-800 my-6" />

            {/* Legal & Preferences Checkboxes */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={
                    willingNsfw
                  }
                  onChange={(
                    e,
                  ) =>
                    setWillingNsfw(
                      e
                        .target
                        .checked,
                    )
                  }
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-[#FF5757] focus:ring-[#FF5757] focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  I
                  am
                  willing
                  to
                  create
                  NSFW
                  content
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={
                    agreedTerms
                  }
                  onChange={(
                    e,
                  ) =>
                    setAgreedTerms(
                      e
                        .target
                        .checked,
                    )
                  }
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-[#FF5757] focus:ring-[#FF5757] focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  By
                  signing
                  up
                  you
                  agree
                  to
                  our
                  Terms
                  of
                  Service
                  and
                  Privacy
                  Policy{" "}
                  <span className="text-[#FF5757]">
                    *
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={
                    confirmedAge
                  }
                  onChange={(
                    e,
                  ) =>
                    setConfirmedAge(
                      e
                        .target
                        .checked,
                    )
                  }
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-[#FF5757] focus:ring-[#FF5757] focus:ring-offset-slate-900 flex-shrink-0"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                  I
                  confirm
                  that
                  I
                  am
                  at
                  least
                  18
                  years
                  old
                  and
                  legally
                  permitted
                  to
                  access
                  and
                  upload
                  content
                  on
                  this
                  Allaccessfans.
                  I
                  acknowledge
                  that
                  I
                  have
                  read,
                  understood,
                  and
                  agree
                  to
                  abide
                  by
                  all
                  platform
                  rules,
                  community
                  guidelines,
                  and
                  content
                  policies.
                  I
                  understand
                  that
                  failure
                  to
                  follow
                  these
                  rules
                  may
                  result
                  in
                  account
                  suspension
                  or
                  termination.{" "}
                  <span className="text-[#FF5757]">
                    *
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={
                    subscribeEmails
                  }
                  onChange={(
                    e,
                  ) =>
                    setSubscribeEmails(
                      e
                        .target
                        .checked,
                    )
                  }
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-[#FF5757] focus:ring-[#FF5757] focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Subscribe
                  to
                  our
                  emails
                  for
                  news
                  delivered
                  directly
                  to
                  you.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={
                !isFormValid ||
                loading
              }
              className="w-full mt-6 bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FF5757]"
            >
              {loading
                ? "Saving Profile..."
                : "Save & Continue to Verification"}
            </button>
          </form>
        </div>
      </div>
    );
  };

export default BioDataSetup;
