--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: create_student_after_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_student_after_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO students (user_id, school_id, class)
        VALUES (NEW.id, NULL, '—');
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_student_after_user() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id bigint NOT NULL,
    lesson_id bigint,
    enrollment_id bigint NOT NULL,
    attendance_date date NOT NULL,
    record_type character varying(30) NOT NULL,
    status character varying(30) NOT NULL,
    duration_value numeric(3,1) NOT NULL,
    format character varying(30) DEFAULT 'offline'::character varying NOT NULL,
    topic character varying(255),
    note text,
    CONSTRAINT attendance_duration_value_check CHECK ((duration_value = ANY (ARRAY[(0)::numeric, 0.5, (1)::numeric]))),
    CONSTRAINT attendance_format_check CHECK (((format)::text = ANY ((ARRAY['offline'::character varying, 'online'::character varying])::text[]))),
    CONSTRAINT attendance_record_type_check CHECK (((record_type)::text = ANY ((ARRAY['lesson'::character varying, 'makeup'::character varying, 'additional'::character varying])::text[]))),
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['present'::character varying, 'absent_excused'::character varying, 'absent_unexcused'::character varying])::text[])))
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    course_number integer NOT NULL,
    level character(1) NOT NULL,
    code character varying(5) NOT NULL,
    CONSTRAINT courses_course_number_check CHECK (((course_number >= 1) AND (course_number <= 5))),
    CONSTRAINT courses_level_check CHECK ((level = ANY (ARRAY['М'::bpchar, 'С'::bpchar])))
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: group_schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_schedule (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    day_of_week character varying(2) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT group_schedule_check CHECK ((end_time > start_time)),
    CONSTRAINT group_schedule_day_of_week_check CHECK (((day_of_week)::text = ANY ((ARRAY['Пн'::character varying, 'Вт'::character varying, 'Ср'::character varying, 'Чт'::character varying, 'Пт'::character varying, 'Сб'::character varying, 'Вс'::character varying])::text[])))
);


ALTER TABLE public.group_schedule OWNER TO postgres;

--
-- Name: group_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.group_schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_schedule_id_seq OWNER TO postgres;

--
-- Name: group_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.group_schedule_id_seq OWNED BY public.group_schedule.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id bigint NOT NULL,
    teacher_id bigint,
    school_id bigint NOT NULL,
    cabinet character varying(20) NOT NULL
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    teacher_id bigint NOT NULL,
    lesson_date date NOT NULL,
    note text
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lessons_id_seq OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: parent_student; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parent_student (
    id bigint NOT NULL,
    parent_id bigint NOT NULL,
    student_id bigint NOT NULL,
    relation_type character varying(20) NOT NULL,
    benefit boolean DEFAULT false NOT NULL,
    CONSTRAINT parent_student_relation_type_check CHECK (((relation_type)::text = ANY ((ARRAY['мать'::character varying, 'отец'::character varying, 'опекун'::character varying])::text[])))
);


ALTER TABLE public.parent_student OWNER TO postgres;

--
-- Name: parent_student_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parent_student_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parent_student_id_seq OWNER TO postgres;

--
-- Name: parent_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parent_student_id_seq OWNED BY public.parent_student.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    enrollment_id bigint NOT NULL,
    payment_date date NOT NULL,
    payment_month integer NOT NULL,
    payment_year integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    note text,
    status character varying(20) DEFAULT 'не оплачено'::character varying NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['наличные'::character varying, 'безналичные'::character varying])::text[]))),
    CONSTRAINT payments_payment_month_check CHECK (((payment_month >= 1) AND (payment_month <= 12))),
    CONSTRAINT payments_payment_year_check CHECK ((payment_year >= 2000)),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['оплачено'::character varying, 'частично'::character varying, 'не оплачено'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: record_books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_books (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    has_record_book boolean DEFAULT false NOT NULL,
    payment_date date,
    amount numeric(10,2),
    payment_method character varying(20),
    note text,
    CONSTRAINT record_books_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['наличные'::character varying, 'безналичные'::character varying])::text[])))
);


ALTER TABLE public.record_books OWNER TO postgres;

--
-- Name: record_books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_books_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_books_id_seq OWNER TO postgres;

--
-- Name: record_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_books_id_seq OWNED BY public.record_books.id;


--
-- Name: schools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schools (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    full_name character varying(255),
    address character varying(255)
);


ALTER TABLE public.schools OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schools_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schools_id_seq OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: student_group_course; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_group_course (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    group_id bigint,
    course_id bigint,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) NOT NULL,
    CONSTRAINT student_group_course_status_check CHECK (((status)::text = ANY ((ARRAY['активен'::character varying, 'завершён'::character varying, 'приостановлен'::character varying])::text[])))
);


ALTER TABLE public.student_group_course OWNER TO postgres;

--
-- Name: student_group_course_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_group_course_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_group_course_id_seq OWNER TO postgres;

--
-- Name: student_group_course_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_group_course_id_seq OWNED BY public.student_group_course.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    user_id bigint NOT NULL,
    school_id bigint,
    class character varying(20) NOT NULL
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teachers (
    user_id bigint NOT NULL,
    work_start_date date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT teachers_work_start_date_check CHECK ((work_start_date >= '2001-01-01'::date))
);


ALTER TABLE public.teachers OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    login character varying(50) NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(20),
    role character varying(20) NOT NULL,
    password_hash text NOT NULL,
    must_change_password boolean DEFAULT true NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'teacher'::character varying, 'student'::character varying, 'parent'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: group_schedule id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_schedule ALTER COLUMN id SET DEFAULT nextval('public.group_schedule_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: parent_student id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_student ALTER COLUMN id SET DEFAULT nextval('public.parent_student_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: record_books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_books ALTER COLUMN id SET DEFAULT nextval('public.record_books_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_group_course id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course ALTER COLUMN id SET DEFAULT nextval('public.student_group_course_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, lesson_id, enrollment_id, attendance_date, record_type, status, duration_value, format, topic, note) FROM stdin;
1	1	7	2026-04-27	lesson	present	1.0	offline	Blender.Анимация	\N
2	1	26	2026-04-27	lesson	absent_excused	0.0	offline	Blender.Анимация	\N
5	\N	14	2026-04-27	additional	present	1.0	online	Циклы. Scretch	\N
6	\N	16	2026-04-26	makeup	present	1.0	offline	Roblox. Создание карты	\N
8	3	1	2026-04-21	lesson	present	1.0	offline	\N	\N
19	6	2	2026-04-28	lesson	present	1.0	offline	\N	Временный ученик
17	6	1	2026-04-28	lesson	absent_excused	0.0	offline	Scratch. Циклы	gegeg
18	6	27	2026-04-28	lesson	present	1.0	offline	Unity. Дизайн 1 уровня	Временный ученик
27	\N	30	2026-05-03	additional	present	1.0	offline	\N	\N
21	\N	33	2026-05-02	makeup	present	1.0	offline	PowerPoint. Свободная тема	отработка за 25.04
20	7	33	2026-05-02	lesson	present	1.0	offline	Итоговый проект. Часть 1	\N
22	8	33	2026-04-25	lesson	present	1.0	offline	\N	\N
23	9	29	2026-05-02	lesson	present	1.0	offline	\N	\N
24	9	16	2026-05-02	lesson	present	1.0	offline	\N	Временный ученик
25	10	1	2026-04-30	lesson	present	1.0	offline	\N	\N
26	10	4	2026-04-30	lesson	present	1.0	offline	\N	Временный ученик
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, course_number, level, code) FROM stdin;
1	1	М	1М
2	2	М	2М
3	3	М	3М
4	4	М	4М
5	1	С	1С
6	2	С	2С
7	3	С	3С
8	4	С	4С
9	5	С	5С
\.


--
-- Data for Name: group_schedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_schedule (id, group_id, day_of_week, start_time, end_time) FROM stdin;
4	3	Вс	12:00:00	15:00:00
20	9	Сб	12:00:00	15:00:00
24	13	Сб	09:00:00	12:00:00
28	14	Сб	10:00:00	13:00:00
30	12	Сб	10:00:00	13:00:00
31	1	Вт	18:00:00	19:30:00
32	1	Чт	18:00:00	19:30:00
33	2	Вс	10:00:00	13:00:00
35	16	Сб	15:00:00	18:00:00
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, teacher_id, school_id, cabinet) FROM stdin;
3	3	3	105
14	27	5	33
13	48	1	409
1	2	1	309
9	55	2	-
12	73	4	11
2	2	2	-
16	55	2	-
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, group_id, teacher_id, lesson_date, note) FROM stdin;
1	3	3	2026-04-27	\N
3	1	2	2026-04-21	\N
7	9	55	2026-05-02	закончили на полчаса раньше из-за эвакуации!
8	9	55	2026-04-25	\N
9	13	48	2026-05-02	\N
10	1	2	2026-04-30	\N
6	1	2	2026-04-28	\N
\.


--
-- Data for Name: parent_student; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parent_student (id, parent_id, student_id, relation_type, benefit) FROM stdin;
1	9	4	мать	f
2	10	5	отец	t
5	13	8	мать	t
8	11	6	мать	f
10	39	23	мать	f
7	39	37	мать	f
12	43	38	отец	f
13	46	47	мать	f
14	49	50	опекун	f
15	12	7	отец	f
16	69	70	мать	f
17	56	57	мать	f
18	39	75	мать	f
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, enrollment_id, payment_date, payment_month, payment_year, amount, payment_method, note, status) FROM stdin;
1	28	2026-04-21	4	2026	6000.00	безналичные		оплачено
3	7	2026-04-21	4	2026	0.00	наличные		не оплачено
4	2	2026-04-22	4	2026	5700.00	наличные	остальная часть будет оплачена в следующем месяце	оплачено
5	29	2026-04-23	1	2026	0.00	наличные		оплачено
6	29	2026-04-23	2	2026	0.00	наличные		оплачено
7	29	2026-04-23	3	2026	0.00	наличные		оплачено
8	29	2026-04-23	4	2026	0.00	наличные		оплачено
9	29	2026-04-23	5	2026	0.00	наличные		оплачено
10	29	2026-04-23	9	2026	0.00	наличные		оплачено
11	29	2026-04-23	10	2026	0.00	наличные		оплачено
12	29	2026-04-23	11	2026	0.00	наличные		оплачено
13	29	2026-04-23	12	2026	0.00	наличные		оплачено
14	32	2026-04-23	3	2026	5700.00	безналичные		оплачено
16	32	2026-04-23	5	2026	5700.00	безналичные		оплачено
15	32	2026-04-22	4	2026	5700.00	безналичные	за 3 месяца единоразово	оплачено
17	3	2026-04-24	1	2026	5700.00	безналичные		оплачено
18	3	2026-04-24	2	2026	5700.00	безналичные		оплачено
19	3	2026-04-24	3	2026	5700.00	безналичные		оплачено
20	3	2026-04-24	4	2026	5700.00	безналичные		оплачено
21	3	2026-04-24	5	2026	5700.00	безналичные		оплачено
22	3	2026-04-24	9	2026	5700.00	безналичные		оплачено
23	3	2026-04-24	10	2026	5700.00	безналичные		оплачено
24	3	2026-04-24	11	2026	5700.00	безналичные		оплачено
25	3	2026-04-24	12	2026	5700.00	безналичные		оплачено
26	33	2026-04-30	5	2026	6000.00	наличные	проверка	оплачено
27	28	2026-04-30	5	2026	6000.00	наличные	проверка	не оплачено
28	1	2026-05-01	5	2026	6000.00	наличные		не оплачено
29	33	2026-04-30	4	2026	6000.00	наличные	проверка2	оплачено
\.


--
-- Data for Name: record_books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_books (id, student_id, has_record_book, payment_date, amount, payment_method, note) FROM stdin;
1	37	t	2026-04-24	500.00	безналичные	
4	57	t	2026-05-01	500.00	безналичные	
2	70	f	2026-04-30	500.00	наличные	проверка
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schools (id, name, full_name, address) FROM stdin;
2	Краснообск	\N	\N
3	Г16	\N	\N
4	27	\N	\N
5	Л13	\N	\N
6	45	МБОУ г. Новосибирск "СОШ №45"	г. Новосибирск, ул. Киевская, д.15А
1	217	МОУ г. Новосибирск "СОШ №217"	г. Новосибирск, ул. Шевелёва, д.3
9	КГ	Краснообская гимназия	Новосибирский район, рабочий посёлок Краснообск, ул. Центральная, д. 20
\.


--
-- Data for Name: student_group_course; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_group_course (id, student_id, group_id, course_id, start_date, end_date, status) FROM stdin;
4	7	2	6	2025-09-01	\N	активен
5	8	2	6	2025-09-01	\N	приостановлен
3	6	2	5	2025-09-01	\N	активен
14	23	2	3	2026-04-10	\N	активен
26	45	3	5	2026-04-10	\N	активен
25	37	\N	2	2026-04-10	2026-04-10	завершён
11	37	9	2	2026-04-10	2026-04-10	завершён
28	37	12	2	2026-04-13	\N	активен
29	50	13	7	2026-04-13	\N	активен
27	47	2	9	2026-04-12	\N	активен
32	58	2	\N	2026-04-17	\N	активен
16	44	14	4	2026-04-10	\N	активен
1	4	1	1	2025-09-01	\N	активен
2	5	14	2	2025-09-01	\N	активен
33	70	9	3	2026-04-19	\N	активен
34	75	16	5	2026-05-02	\N	активен
30	57	9	6	2026-04-13	\N	активен
7	38	3	5	2026-04-07	\N	активен
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (user_id, school_id, class) FROM stdin;
7	2	8В
8	3	9А
4	1	3А
6	2	7А
23	4	3А
37	5	2В
45	3	5в
50	1	9Б
47	5	-
58	\N	-
44	4	-
5	1	3Б
70	9	3Г
75	9	6Б
57	3	6Г
38	3	5А
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers (user_id, work_start_date) FROM stdin;
2	2026-04-16
3	2026-04-16
18	2026-04-16
25	2026-04-16
27	2026-04-16
48	2026-04-16
55	2026-04-16
63	2015-09-16
73	2024-09-01
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, login, full_name, phone, role, password_hash, must_change_password, status) FROM stdin;
2	teacher1	Иванов Иван Иванович	79000000002	teacher	teacher123	t	active
3	teacher2	Петров Петр Петрович	79000000003	teacher	teacher123	t	active
7	student4	Попова Анна	79000000007	student	student123	t	active
9	parent1	Сидорова Ольга	79000000009	parent	parent123	t	active
11	parent3	Смирнова Елена	79000000011	parent	parent123	t	active
8	student5	Волков Артем	79000000008	student	student123	t	inactive
13	parent5	Волкова Ирина	79000000013	parent	parent123	t	inactive
69	ovalnayan	Овальная Надежда	+71223334444	parent	$2b$10$iOKxmO7JEB6WcvV7eD2eUuLw7/tu9Yrd/3fR1J7vYlP9QsBidNBxu	t	active
63	lomanchelloa	Ломанчелло Аглая	-	teacher	$2b$10$Xav6DvM1jXLC796HZizu/uqEBevf.SACe7VITWjLIvQposmy.S0hu	t	active
23	student new3	Покровский Борис Андреевич	79999999999	student	123	t	active
39	parent_1775580592397	Белокозова Big	79005555555	parent	12345	t	active
38	student_1775578396037	Григорьевых Арина	+74486752491	student	12345	t	active
47	student_1775961613610	Щинникова Алина Малина	+76567567566	student	12345	t	active
37	student_1775577044651	Белокозова Анна А	1234567888	student	12345	t	active
58	moiseevabr	Моисеева Бежеслава Родионовна	-	student	$2b$10$JZUBnmWE2VEHMdiGWP4uMuisp3W3Ns3VQ5G1aQT0uE5KfgOXItlPe	t	active
45	student_1775834977078	пупупу	-	student	12345	t	active
4	student1	Сидоров Алексей	79000000004	student	student123	t	active
55	azbukinkm	Азбукин Кирилл Мефодвич	+79998887749	teacher	$2b$10$j4.RpFpmwE056RG3fIM7TuR66YfOhb/y4zkd3HZu3FBLCpKSAwodm	f	active
46	parent_1775961603773	Щинникова Ольга Малина	-	parent	12345	t	active
44	student_1775832774118	Пунькин Пуня	-	student	12345	t	active
6	student3	Смирнов Даниил	79000000006	student	student123	t	active
49	lozhechkinkn	Ложечкин Константин Никоаевич	79136663422	parent	$2b$10$zn7k0XbHCl/FXT08uoSUSOutPIofTwMWrmPrzPVycKMhIocD3fcUm	t	active
50	lozhechkinaik	Ложечкина Инна Константиновна	-	student	$2b$10$hgHXr8eqMZ4S6nek35RUMOY3FKO9mLgURa1ikZAjExG6kYCCPZ5Gy	t	active
12	parent4	Попов Андрей	79000000012	parent	parent123	t	active
27	teacher_1775549218643	Александрова Александра	+76576554765	teacher	12345	t	active
61	pushkinas	Пушкин Александрович Сергеевич	-	teacher	$2b$10$ZW/ziAqigzRAuEphD9nQ0O/C9LPcO0ZXE1T4dzodJTlgDO29XVpHq	t	active
48	subbotinvn	Субботин Виктор Николаевич	+79134005530	teacher	$2b$10$u2B.aDAsko62KI7DLoVQx.VM477/q4LIa6EJEEKDPBI0xP6r.5zuu	t	active
25	teacher_new	Новый преподаватель	+79999999999	teacher	123	t	active
18	teacher new	Новый преподаватель	+79999999999	teacher	123	t	inactive
10	parent2	Кузнецов Сергей	+79000000010	parent	parent123	t	active
73	belochkinavv	Белочкина Василиса Витальевна	-	teacher	$2b$10$.lh1Uy8zC3rgg6PsiBMweeW26YPJqZn.5q2oXOXRzyUwil9WTCaS.	t	active
1	admin1	Администратор Главный Административович	+79135553452	admin	$2b$10$pyCI8FGod5VXQt6EYy3zEOIF2GJr0elfPHXMkdraWTqWsh1F4Lo3i	f	active
56	myavlo	Мявл Ольга	-	parent	$2b$10$5xmQmE.iq9MGqTcwxB1bceVRf39nyB5.yaG0V4INCXKOVALEIwZdu	f	active
5	student2	Кузнецова Мария	+79000000005	student	student123	t	active
43	parent_1775809348123	Григорьевых Алексей Евгеньевич	+79000000000	parent	12345	t	active
70	ovalnyyaa	Овальный Анатолий Алексеевич	+77777777778	student	$2b$10$OvNeXsqF3PYwR3S1hileEeGYuGe9tPwEHRnYY22ML6S/UonJyfY4G	t	active
75	pokrovskiyl	Покровский Леонид	+72345678900	student	$2b$10$6EOnvG7Vo1SzqXIulIQds.JHNny1yJx.eUThdyfUkj99w/1tfQW1G	t	active
57	myavlka	Мявл Карина Александровна	+70978987865	student	$2b$10$dOf4OEEYScHdjFTFMNwro.4RBjvcnuDQ5eOejTR4M.sUp0XspFy5a	f	active
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 27, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_id_seq', 9, true);


--
-- Name: group_schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.group_schedule_id_seq', 35, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 16, true);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lessons_id_seq', 10, true);


--
-- Name: parent_student_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parent_student_id_seq', 18, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 29, true);


--
-- Name: record_books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_books_id_seq', 6, true);


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schools_id_seq', 9, true);


--
-- Name: student_group_course_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_group_course_id_seq', 34, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 75, true);


--
-- Name: attendance attendance_lesson_enrollment_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_lesson_enrollment_unique UNIQUE (lesson_id, enrollment_id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: group_schedule group_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_schedule
    ADD CONSTRAINT group_schedule_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_group_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_group_date_unique UNIQUE (group_id, lesson_date);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: parent_student parent_student_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_pkey PRIMARY KEY (id);


--
-- Name: payments payments_enrollment_id_payment_month_payment_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_enrollment_id_payment_month_payment_year_key UNIQUE (enrollment_id, payment_month, payment_year);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: record_books record_books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_books
    ADD CONSTRAINT record_books_pkey PRIMARY KEY (id);


--
-- Name: record_books record_books_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_books
    ADD CONSTRAINT record_books_student_id_key UNIQUE (student_id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: student_group_course student_group_course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course
    ADD CONSTRAINT student_group_course_pkey PRIMARY KEY (id);


--
-- Name: student_group_course student_group_course_student_id_group_id_course_id_start_da_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course
    ADD CONSTRAINT student_group_course_student_id_group_id_course_id_start_da_key UNIQUE (student_id, group_id, course_id, start_date);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (user_id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (user_id);


--
-- Name: users users_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_login_key UNIQUE (login);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users trigger_create_student; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_create_student AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_student_after_user();


--
-- Name: attendance attendance_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.student_group_course(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: group_schedule group_schedule_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_schedule
    ADD CONSTRAINT group_schedule_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: groups groups_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: groups groups_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(user_id);


--
-- Name: lessons lessons_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(user_id);


--
-- Name: parent_student parent_student_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: parent_student parent_student_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(user_id) ON DELETE CASCADE;


--
-- Name: payments payments_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.student_group_course(id) ON DELETE CASCADE;


--
-- Name: record_books record_books_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_books
    ADD CONSTRAINT record_books_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(user_id) ON DELETE CASCADE;


--
-- Name: student_group_course student_group_course_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course
    ADD CONSTRAINT student_group_course_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: student_group_course student_group_course_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course
    ADD CONSTRAINT student_group_course_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: student_group_course student_group_course_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_group_course
    ADD CONSTRAINT student_group_course_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(user_id) ON DELETE CASCADE;


--
-- Name: students students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

