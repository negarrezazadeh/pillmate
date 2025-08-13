export default function Home() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">یادآور مصرف دارو</h1>

      <form className="space-y-4">
        <div>
          <label htmlFor="drugName" className="block mb-1 font-medium">
            نام دارو
          </label>
          <input
            id="drugName"
            name="drugName"
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="مثل: آموکسی‌سیلین"
          />
        </div>

        <div>
          <label htmlFor="dosage" className="block mb-1 font-medium">
            میزان مصرف در هر نوبت
          </label>
          <input
            id="dosage"
            name="dosage"
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="مثل: 1 قرص یا 5 سی‌سی"
          />
        </div>

        <div>
          <label htmlFor="time" className="block mb-1 font-medium">
            زمان مصرف
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">روزهای مصرف</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              "شنبه",
              "یکشنبه",
              "دوشنبه",
              "سه‌شنبه",
              "چهارشنبه",
              "پنجشنبه",
              "جمعه",
              "همه روزها",
            ].map((day) => (
              <label key={day} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="days"
                  value={day}
                  className="rounded text-blue-600"
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-2 px-4 rounded text-white font-medium
          }`}>
          یادآوری
        </button>
      </form>
    </div>
  );
}
