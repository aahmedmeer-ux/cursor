let swal;

export default function lazySwal() {
    if (swal) {
        return Promise.resolve(swal);
    }
    return import('./sweet-alert').then(module => {
        swal = module.default;
        return swal;
    });
}
