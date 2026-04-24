import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── SQL para rodar no Supabase (copie e execute no SQL Editor) ───────────────
/*
-- PATIENTS
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text unique not null,
  birth_date date,
  mother_name text,
  created_at timestamptz default now()
);

-- VISITS
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  visit_type text not null,
  oci_subtype text,
  status text not null default 'triagem',
  created_at timestamptz default now()
);

-- TRIAGE
create table if not exists triage (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  consultation_reason text,
  main_complaints jsonb default '[]',
  other_complaint text,
  systemic_diseases jsonb default '[]',
  diabetes_duration text,
  hypertension_duration text,
  continuous_medications jsonb default '[]',
  other_medications text,
  previous_eye_surgery boolean default false,
  eye_surgeries jsonb,
  eye_trauma boolean default false,
  trauma_details jsonb,
  drug_allergy boolean default false,
  drug_allergy_description text,
  av_od_cc text,
  av_od_sc text,
  av_oe_cc text,
  av_oe_sc text,
  autorefractor_photo_url text,
  autorefractor_od jsonb,
  autorefractor_oe jsonb,
  biometry_photo_url text,
  biometry_od_axial numeric,
  biometry_oe_axial numeric,
  triage_notes text,
  created_at timestamptz default now()
);

-- MEDICAL RECORDS
create table if not exists medical_records (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  biomicroscopy_od text,
  biomicroscopy_oe text,
  fo_od jsonb default '[]',
  fo_oe jsonb default '[]',
  tono_od text,
  tono_oe text,
  orthoptic_motility text,
  orthoptic_fusion text,
  orthoptic_pupils text,
  orthoptic_deviation text,
  topography text,
  mec text,
  diagnostic_impressions jsonb default '[]',
  other_diagnosis text,
  cid text,
  conduct jsonb,
  patient_consent boolean default false,
  created_at timestamptz default now()
);

-- APPOINTMENTS
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  scheduled_date date,
  scheduled_time time,
  procedure text,
  eye text,
  notes text,
  status text default 'agendado',
  created_at timestamptz default now()
);

-- Enable RLS (row level security) — disable if not using auth
alter table patients enable row level security;
alter table visits enable row level security;
alter table triage enable row level security;
alter table medical_records enable row level security;
alter table appointments enable row level security;

-- Allow all for now (adjust when you add authentication)
create policy "allow all" on patients for all using (true) with check (true);
create policy "allow all" on visits for all using (true) with check (true);
create policy "allow all" on triage for all using (true) with check (true);
create policy "allow all" on medical_records for all using (true) with check (true);
create policy "allow all" on appointments for all using (true) with check (true);
*/
