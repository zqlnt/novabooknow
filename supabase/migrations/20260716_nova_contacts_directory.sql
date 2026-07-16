-- Nova contact directory migration + seed
-- Designed for the supplied Nova Org Supabase schema.
-- Run this AFTER the main schema/seed script.
-- Safe to run repeatedly: records are upserted by organisation_id + reference_code.
-- Do not mirror this seed into the local mock SEED_DB — live data comes from Supabase.

begin;

insert into public.organisations (id, slug, name)
values ('00000000-0000-0000-0000-000000000001', 'nova', 'Nova Education')
on conflict (id) do update
set name = excluded.name,
    updated_at = now();

create table if not exists public.contacts (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    reference_code text not null,
    contact_name text not null,
    contact_type text not null default 'parent_guardian'
        check (contact_type in ('parent_guardian', 'student', 'staff', 'other')),
    phone text,
    linked_names text,
    family_id uuid references public.families(id) on delete set null,
    student_id uuid references public.students(id) on delete set null,
    staff_id uuid references public.staff(id) on delete set null,
    source_image text,
    review_required boolean not null default false,
    notes text,
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organisation_id, reference_code)
);

create index if not exists idx_contacts_org_name
    on public.contacts (organisation_id, contact_name);

create index if not exists idx_contacts_org_phone
    on public.contacts (organisation_id, phone);

create index if not exists idx_contacts_family
    on public.contacts (family_id);

alter table public.contacts enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'contacts'
          and policyname = 'members read contacts'
    ) then
        create policy "members read contacts"
        on public.contacts
        for select
        to authenticated
        using (public.is_org_member(organisation_id));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'contacts'
          and policyname = 'managers insert contacts'
    ) then
        create policy "managers insert contacts"
        on public.contacts
        for insert
        to authenticated
        with check (public.can_manage_org(organisation_id));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'contacts'
          and policyname = 'managers update contacts'
    ) then
        create policy "managers update contacts"
        on public.contacts
        for update
        to authenticated
        using (public.can_manage_org(organisation_id))
        with check (public.can_manage_org(organisation_id));
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'contacts'
          and policyname = 'managers delete contacts'
    ) then
        create policy "managers delete contacts"
        on public.contacts
        for delete
        to authenticated
        using (public.can_manage_org(organisation_id));
    end if;
end
$$;

with seed (
    reference_code,
    contact_name,
    contact_type,
    phone,
    linked_names,
    family_reference,
    student_reference,
    staff_reference,
    source_image,
    review_required,
    notes
) as (
    values
    ('CONT001', 'Amina Chebel', 'staff', '+44 7446 506125', null, null, null, 'S03', 'IMG_0036.PNG', false, 'Tutor.'),
    ('CONT002', 'Amin', 'parent_guardian', '+44 7541 900368', 'Tala', null, null, null, 'IMG_0048.PNG', false, null),
    ('CONT003', 'Angelina Fosu', 'parent_guardian', '+44 7404 668739', 'Daniel; Christobel', 'FAM006', null, null, 'IMG_0038.PNG', false, null),
    ('CONT004', 'Aysha Iqbal', 'parent_guardian', '+44 7479 817623', 'Zain', 'FAM011', null, null, 'IMG_0047.PNG', false, null),
    ('CONT005', 'Faiza Al-Ashai', 'student', '+44 7454 033110', null, 'FAM002', 'STU004', null, 'IMG_0042.PNG', false, 'Saved as a student contact.'),
    ('CONT006', 'Gehan Sedahmed', 'parent_guardian', '+44 7424 882627', 'Sima; Yasser', 'FAM013', null, null, 'IMG_0054.PNG', false, null),
    ('CONT007', 'Hafso Ibrahim', 'parent_guardian', '+44 7708 701025', 'Latifa', null, null, null, 'IMG_0049.PNG', false, null),
    ('CONT008', 'Manal', 'parent_guardian', '+44 7403 773498', 'Zeyneb', null, null, null, 'IMG_0039.PNG', false, null),
    ('CONT009', 'Mery', 'parent_guardian', '+44 7478 386062', 'Bithania', null, null, null, 'IMG_0046.PNG', false, null),
    ('CONT010', 'Motasim Ahmed', 'parent_guardian', '+44 7446 055050', 'Ali; Shahd; Abbass', 'FAM009', null, null, 'IMG_0041.PNG', true, 'Existing family seed uses Motasim Abbas; confirm the preferred parent name.'),
    ('CONT011', 'Tahira Jabeen', 'parent_guardian', '+44 7405 888701', 'Aisha', null, null, null, 'IMG_0037.PNG', false, null),
    ('CONT012', 'Tasneem Osma', 'parent_guardian', '+44 7459 378883', 'Hzar', null, null, null, 'IMG_0055.PNG', true, 'Confirm the spelling of the linked child name Hzar.'),
    ('CONT013', 'Tracey Martina', 'parent_guardian', '+44 7366 590779', 'Elijah; Alyaa', 'FAM003', null, null, 'IMG_0051.PNG; IMG_0052.PNG', true, 'Existing family seed uses Tracy Pater; WhatsApp also displayed Tracy / Meryem.'),
    ('CONT014', 'Wasim', 'parent_guardian', '+44 7577 401581', 'Zaynab; Ismaeel', null, null, null, 'IMG_0053.PNG', false, 'WhatsApp business field displayed Stim Clinic.'),
    ('CONT015', 'Yusuf Omar', 'parent_guardian', '+44 7411 995404', 'Faiza; Magda; Zaynab', 'FAM002', null, null, 'IMG_0043.PNG', false, 'Additional contact for the Marafee Omar family.'),
    ('CONT016', 'Mohammed Ahmed Abdulrahman', 'other', '+44 7425 400490', null, 'FAM001', null, null, 'IMG_0044.PNG', true, 'Role in the family was not shown.'),
    ('CONT017', 'Taqwa Mustafa Nasir', 'other', '+44 7470 778709', null, null, null, null, 'IMG_0040.PNG', true, 'No linked child or role was shown.'),
    ('CONT018', 'Unconfirmed parent', 'parent_guardian', '+44 7487 651005', 'Unconfirmed child - Year 8', null, null, null, 'IMG_0045.PNG', true, 'Saved with placeholder wording: child coming tomorrow.'),
    ('CONT019', 'Unknown contact', 'other', '+44 7931 653020', null, null, null, null, 'IMG_0050.PNG', true, 'No name was saved for this number.'),
    ('CONT020', 'Jamaad Mohamoud', 'parent_guardian', '+44 7735 011989', 'Ibrahim; Suraya', 'FAM008', null, null, 'IMG_0056.PNG', false, null),
    ('CONT021', 'Eman Mohammad', 'parent_guardian', '+44 7522 040790', 'Tala', 'FAM012', null, null, 'IMG_0057.PNG', true, 'Existing family seed uses Eman Muhammed; confirm preferred spelling.'),
    ('CONT022', 'Afrah Ibrahim', 'parent_guardian', '+44 7923 154087', 'Rudaina', 'FAM005', null, null, 'IMG_0058.PNG', false, 'Existing family record also links Yazeed and Leena.'),
    ('CONT023', 'Ms Manneh', 'parent_guardian', '+44 7728 496297', 'Omar', null, null, null, 'IMG_0059.PNG', false, null),
    ('CONT024', 'Abda Elbushra', 'parent_guardian', '+44 7507 497990', 'Rawia', 'FAM014', null, null, 'IMG_0062.PNG', false, null),
    ('CONT025', 'Ekhlas', 'parent_guardian', '+44 7578 872225', 'Tasneem', null, null, null, 'IMG_0063.PNG', false, null),
    ('CONT026', 'Marafee Omar', 'parent_guardian', '+44 7427 201428', 'Faiza; Magda; Zaynab', 'FAM002', null, null, 'IMG_0064.PNG', false, null),
    ('CONT027', 'Salma I', 'parent_guardian', '+44 7846 509599', 'Maissa Sharif', 'FAM010', null, null, 'IMG_0065.PNG', true, 'Existing family seed uses Salma Ishak; screenshot abbreviated the surname to I.')
)
insert into public.contacts (
    organisation_id,
    reference_code,
    contact_name,
    contact_type,
    phone,
    linked_names,
    family_id,
    student_id,
    staff_id,
    source_image,
    review_required,
    notes,
    status
)
select
    '00000000-0000-0000-0000-000000000001'::uuid,
    s.reference_code,
    s.contact_name,
    s.contact_type,
    s.phone,
    s.linked_names,
    (
        select f.id
        from public.families f
        where f.organisation_id = '00000000-0000-0000-0000-000000000001'::uuid
          and f.reference_code = s.family_reference
    ),
    (
        select st.id
        from public.students st
        where st.organisation_id = '00000000-0000-0000-0000-000000000001'::uuid
          and st.reference_code = s.student_reference
    ),
    (
        select sf.id
        from public.staff sf
        where sf.organisation_id = '00000000-0000-0000-0000-000000000001'::uuid
          and sf.reference_code = s.staff_reference
    ),
    s.source_image,
    s.review_required,
    s.notes,
    'active'
from seed s
on conflict (organisation_id, reference_code) do update
set contact_name = excluded.contact_name,
    contact_type = excluded.contact_type,
    phone = excluded.phone,
    linked_names = excluded.linked_names,
    family_id = excluded.family_id,
    student_id = excluded.student_id,
    staff_id = excluded.staff_id,
    source_image = excluded.source_image,
    review_required = excluded.review_required,
    notes = excluded.notes,
    status = excluded.status,
    updated_at = now();

with family_updates (
    reference_code,
    phone,
    linked_student_names
) as (
    values
    ('FAM002', '+44 7427 201428', 'Zaynab Al-Ashai; Magda Al-Ashai; Faiza Al-Ashai'),
    ('FAM003', '+44 7366 590779', 'Elijah Martina; Alyaa Martina'),
    ('FAM005', '+44 7923 154087', 'Rudaina; Yazeed; Leena'),
    ('FAM006', '+44 7404 668739', 'Daniel Manu; Christobel'),
    ('FAM008', '+44 7735 011989', 'Ibrahim; Suraya'),
    ('FAM009', '+44 7446 055050', 'Ali; Shahd; Abbass'),
    ('FAM010', '+44 7846 509599', 'Maissa Sharif'),
    ('FAM011', '+44 7479 817623', 'Zain'),
    ('FAM012', '+44 7522 040790', 'Tala'),
    ('FAM013', '+44 7424 882627', 'Sima; Yasser'),
    ('FAM014', '+44 7507 497990', 'Rawia')
)
update public.families f
set phone = u.phone,
    linked_student_names = u.linked_student_names,
    updated_at = now()
from family_updates u
where f.organisation_id = '00000000-0000-0000-0000-000000000001'::uuid
  and f.reference_code = u.reference_code;

commit;
