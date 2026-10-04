    async function checkGardenStatus() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedGardenId = urlParams.get('id');

        const response = await OwnerAuth.authFetch('/api/owner/gardens');
        
        if (!response.ok) {
          console.error('ไม่สามารถดึงข้อมูลจาก API ได้:', response.status);
          return;
        }

        const data = await response.json();
        const gardensList = data.gardens || [];

        if (gardensList.length === 0) return;

        const garden = selectedGardenId
          ? gardensList.find(g => String(g._id) === selectedGardenId) || gardensList[0]
          : gardensList[0];

        const configMap = {
          'status-info': {
            isCompleted: Boolean(garden.garden_name && garden.contact?.phone),
            link: 'add-garden1.html'
          },
          'status-standard': {
            isCompleted: Boolean(Array.isArray(garden.standards) && garden.standards.length > 0),
            link: 'standard-gaeden.html'
          },
          'status-products': {
            isCompleted: Boolean(garden.products && garden.products.length > 0),
            link: 'type-price-fruit.html'
          },
          'status-workshop': {
            isCompleted: Boolean(garden.workshops && garden.workshops.length > 0),
            link: 'workshop-promotion.html'
          },
          'status-booking': {
            isCompleted: Boolean(garden.bookingOpen !== undefined),
            link: 'booking.html'
          },
          'status-homestay': {
            isCompleted: Boolean(garden.hasHomestay === true),
            link: 'homestay.html'
          },
          'status-homestayBooking': {
            isCompleted: Boolean(garden.hasHomestay === true),
            link: 'homestay_booking.html'
          },
          'status-gaedenOpen': {
            isCompleted: Boolean(garden.openStatus),
            link: 'gaedenOpen.html'
          }
        };

        Object.keys(configMap).forEach(id => {
          const item = configMap[id];
          const el = document.getElementById(id);
          if (!el) return;

          const linkWithId = `${item.link}?id=${garden._id}`;

          if (item.isCompleted) {
            el.innerHTML = `
              <span class="status-badge completed"><span>✔︎</span> เพิ่มข้อมูลเรียบร้อย</span>
              <button type="button" class="btn-btn-view" onclick="location.href='garden-list.html'">ดูผลลัพธ์</button>
              <button type="button" class="btn-btn-view" onclick="location.href='${linkWithId}'">แก้ไข</button>
            `;
          } else {
            el.innerHTML = `
              <span class="status-badge pending"><span>⏳</span> ยังไม่ได้เพิ่มข้อมูล</span>
              <button type="button" class="btn-btn-add" onclick="location.href='${linkWithId}'">+ เพิ่มข้อมูล</button>
            `;
          }
        });

      } catch (err) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์:', err);
      }
    }

    document.addEventListener('DOMContentLoaded', checkGardenStatus);