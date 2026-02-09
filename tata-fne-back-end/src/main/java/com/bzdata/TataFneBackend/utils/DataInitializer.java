package com.bzdata.TataFneBackend.utils;

import com.bzdata.TataFneBackend.Funtionality.Functionality;
import com.bzdata.TataFneBackend.Funtionality.FunctionalityRepository;
import com.bzdata.TataFneBackend.attributionDroit.Attribution;
import com.bzdata.TataFneBackend.attributionDroit.AttributionRepository;
import com.bzdata.TataFneBackend.gestionSocieteEntrepriseService.*;
import com.bzdata.TataFneBackend.role.Role;
import com.bzdata.TataFneBackend.role.RoleRepository;
import com.bzdata.TataFneBackend.rolefunctionality.RoleFunctionality;
import com.bzdata.TataFneBackend.rolefunctionality.RoleFunctionalityRepository;
import com.bzdata.TataFneBackend.user.User;
import com.bzdata.TataFneBackend.user.UserRepository;
import com.github.javafaker.Faker;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Configuration
@Transactional
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(
            RoleRepository roleRepository,
            SocieteRepository societeRepository,
            EtablissementRepository etablissementRepository,
            FunctionalityRepository functionalityRepository,
            RoleFunctionalityRepository roleFunctionalityRepository,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository,
            AttributionRepository attributionRepository,
            DepartmentRepository serviceRepository
    ) {
        return args -> {
            Faker faker = new Faker(new Locale("fr"));
            Random random = new Random();

            System.out.println("🚀 Initialisation de la base de données...");

            // --- 1️⃣ Initialisation des rôles
            if (roleRepository.findByName("ADMIN").isEmpty()) {
                roleRepository.save(Role.builder().name("ADMIN").code("ADMIN").build());
            }
            if (roleRepository.findByName("USER").isEmpty()) {
                roleRepository.save(Role.builder().name("USER").code("USER").build());
            }if (roleRepository.findByName("FACTURIER").isEmpty()) {
                roleRepository.save(Role.builder().name("FACTURIER").code("FACT").build());
            }

            // --- 2️⃣ Création de sociétés
            if (societeRepository.count() == 0) {
//                for (int i = 0; i < 10; i++) {
//                    String raisonSociale = faker.company().name();
//                    String sigle = raisonSociale.split(" ")[0].toUpperCase();
//                    String code = "SOC" + faker.number().digits(4);
//                    String ncc = faker.number().digits(7)+faker.regexify("[A-Z]") ;
//                    String libelleSocielle = "Société " + raisonSociale;
//                    String formeJuridique = faker.options().option(
//                            "SARL", "SA", "SCS", "GIE", "SNC", "SCA", "COOPERATIVE"
//                    );
//                    String objetSocial = faker.company().catchPhrase();
//                    String numeroRccm = "CI-ABJ-" + faker.number().digits(6);
//                    String numeroIfu = "IFU" + faker.number().digits(8);
//                    Double capitalSocial = 1_000_0000 + (random.nextDouble() * 9_000_000);
//                    String siegeSocial = faker.address().streetAddress();
//                    String pays = faker.address().country();
//                    String imageUrl = "https://picsum.photos/seed/" + sigle + "/200/200";
//                    String ville = faker.address().city();
//                    String adresse = faker.address().fullAddress();
//                    String telephone = faker.phoneNumber().phoneNumber();
//                    String email = faker.internet().emailAddress();
//
//                    String siteWeb = "www." + sigle.toLowerCase() + ".com";
//                    String dirigeantPrincipal = faker.name().fullName();
//
//                    Societe societe = Societe.builder()
//                            .raisonSociale(raisonSociale)
//                            .sigle(sigle)
//                            .code(code)
//                            .ncc(ncc)
//                            .libelleSocielle(libelleSocielle)
//                            .formeJuridique(formeJuridique)
//                            .objetSocial(objetSocial)
//                            .numeroRccm(numeroRccm)
//                            .numeroIfu(numeroIfu)
//                            .capitalSocial(capitalSocial)
//                            .siegeSocial(siegeSocial)
//                            .pays(pays)
//                            .imageUrl(imageUrl)
//                            .ville(ville)
//                            .adresse(adresse)
//                            .telephone(telephone)
//                            .email(email)
//                            .siteWeb(siteWeb)
//                            .dirigeantPrincipal(dirigeantPrincipal)
//                            .build();
//
//                    societeRepository.save(societe);
//                }
                Societe societe = Societe.builder()
                           .raisonSociale("Moderne hygiene")
                           .sigle("MH")
                            .code("mh-001")
                            .ncc("2404924S")
                            .libelleSocielle("Moderne hygiene")
                           .formeJuridique("RNI")
//                            .objetSocial(objetSocial)
//                            .numeroRccm(numeroRccm)
//                            .numeroIfu(numeroIfu)
//                            .capitalSocial(capitalSocial)
                            .siegeSocial("Cocody")
                           .pays("Côte d'Ivoire")
//                            .imageUrl(imageUrl)
//                            .ville("ABIDJAN")
//                            .adresse(adresse)
//                            .telephone(telephone)
                           .email("modernehygienefne@gmail.com")
//                            .siteWeb(siteWeb)
//                            .dirigeantPrincipal(dirigeantPrincipal)
                           .build();
                societeRepository.save(societe);
//
//                    societeRepository.save(societe);
                System.out.println("🏢 5 sociétés créées.");
            }

            // --- 3️⃣ Création d’établissements
//            var societes = societeRepository.findAll();
//            String[] types = {"Siège", "Agence", "Atelier", "Entrepôt", "Filiale"};
//            String[] activites = {
//                    "Transport de marchandises",
//                    "Maintenance des véhicules",
//                    "Support administratif",
//                    "Service client",
//                    "Gestion logistique"
//            };
//            for (Societe s : societes) {
//                int nombreEtab = random.nextInt(2, 6); // entre 2 et 5 par société
//                for (int i = 0; i < nombreEtab; i++) {
//
//                    Etablissement etab = new Etablissement();
//                    etab.setCodeEtablissement("ETB-" + faker.number().digits(5));
//                    etab.setNom(faker.company().name());
//                    etab.setTypeEtablissement(types[random.nextInt(types.length)]);
//                    etab.setAdresse(faker.address().streetAddress());
//                    etab.setVille(faker.address().cityName());
//                    etab.setTelephone("+225 " + faker.phoneNumber().cellPhone());
//                    etab.setEmail(faker.internet().emailAddress());
//                    etab.setResponsable(faker.name().fullName());
//                    etab.setDateOuverture(faker.date().birthday(1, 20).toString());
//                    etab.setActivitePrincipale(activites[random.nextInt(activites.length)]);
//                    etab.setEffectif(random.nextInt(10, 300));
//                    etab.setSociete(s);
//                    etab.setUtilisateurs(Set.of()); // vide pour l’instant
//
//                    etablissementRepository.save(etab);
//                }
//            }
//            System.out.println("🏫 Établissements créés pour chaque société.");
//
//            // --- 4️⃣ Création des services
//            var etablissements = etablissementRepository.findAll();
//            for (Etablissement e : etablissements) {
//                for (int i = 0; i < random.nextInt(2, 6); i++) {
//                    Department service = Department.builder()
//                            .code("SRV" + faker.number().digits(4))
//                            .nom(faker.company().profession())
//                            .etablissement(e)
//                            .build();
//                    serviceRepository.save(service);
//                }
//            }
//
//            System.out.println("🧩 Services créés pour chaque établissement.");
//            System.out.println("✅ Données initialisées avec succès !");
//
//
//            if (functionalityRepository.count() == 0) {
//
//
//                System.out.println("🚀 Initialisation des fonctionnalités...");
//
//                for (int i = 1; i <= 5; i++) {
//                    String code = String.format("FUNC%03d", i);
//                    String name = faker.job().position(); // Ex: "Responsable marketing"
//                    String description = faker.lorem().sentence(random.nextInt(6, 12));
//
//                    Functionality f = new Functionality();
//                    f.setCodeFunctionality(code);
//                    f.setNameFunctionality(name);
//                    f.setDescriptionFunctionality(description);
//
//                    functionalityRepository.save(f);
//                }
//
//                System.out.println("✅ 5 fonctionnalités fictives créées !");
//            } else {
//                System.out.println("ℹ️ Les fonctionnalités existent déjà, initialisation ignorée.");
//            }
//            // 1️⃣ Vérifie que des rôles et fonctionnalités existent
//            List<Role> roles = roleRepository.findAll();
//            List<Functionality> functionalities = functionalityRepository.findAll();
//
//            if (roles.isEmpty() || functionalities.isEmpty()) {
//                System.out.println("⚠️ Impossible de créer des permissions : rôles ou fonctionnalités vides.");
//                return;
//            }
//
//            // 2️⃣ Créer un jeu de 50 permissions aléatoires
//            for (int i = 0; i < 50; i++) {
//                Role randomRole = roles.get(random.nextInt(roles.size()));
//                Functionality randomFunc = functionalities.get(random.nextInt(functionalities.size()));
//
//                RoleFunctionality rf = new RoleFunctionality();
//                rf.setRole(randomRole);
//                rf.setFunctionality(randomFunc);
//                rf.setDateAffected(LocalDate.now().minusDays(random.nextInt(100)));
//
//                // 3️⃣ Génération aléatoire des droits
//                rf.setLecture(random.nextBoolean());
//                rf.setWriting(random.nextBoolean());
//                rf.setModification(random.nextBoolean());
//                rf.setDeletion(random.nextBoolean());
//                rf.setImpression(random.nextBoolean());
//                rf.setValidation(random.nextBoolean());
//
//                roleFunctionalityRepository.save(rf);
//            }
//
//            System.out.println("✅ 50 permissions générées aléatoirement !");
//
//            if (userRepository.count() > 0) {
//                System.out.println("✅ Les utilisateurs existent déjà, aucune initialisation nécessaire.");
//                return;
//            }
//
//            System.out.println("🚀 Génération de données utilisateurs...");
   Role adminRole = roleRepository.findByName("ADMIN")
                    .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").code("ADMIN").build()));
//            // 🔹 Récupération des rôles existants
           Role userRole = roleRepository.findByName("USER")
                   .orElseGet(() -> roleRepository.save(Role.builder().name("USER").code("USER").build()));
//
//
//
//            // 🔹 Liste d’agences factices
//            List<String> agences = List.of("AGENCE ABIDJAN", "AGENCE YAMOUSSOUKRO", "AGENCE BOUAKÉ", "AGENCE DALOAS", "AGENCE SAN PEDRO");
//
//            // 🔹 Récupération éventuelle des établissements
//             List<Etablissement> etablissments = etablissementRepository.findAll();
//           // List<Etablissement> etablissments = etablissementRepository.findAllWithSociete();
//            etablissments.forEach(e -> e.getSociete().getId());
//
//
//            // 🔹 Création de 10 utilisateurs normaux
//            for (int i = 0; i < 10; i++) {
//                String firstname = faker.name().firstName();
//                String lastname = faker.name().lastName();
//                String email = (firstname + "." + lastname + "@example.com").toLowerCase();
//
//                User user = User.builder()
//                        .firstname(firstname)
//                        .lastname(lastname)
//                        .email(email)
//                        .agence(agences.get(random.nextInt(agences.size())))
//                        .dateOfBirth(LocalDate.now().minusYears(random.nextInt(20, 50)))
//                        .imageUrl("https://i.pravatar.cc/150?u=" + email)
//                        .password(passwordEncoder.encode("admin123"))
//                        .accountLocked(false)
//                        .enabled(true)
//                        .roles(List.of(userRole))
//                        .build();
//
//                // Associer éventuellement 1 à 2 établissements
//                if (!etablissments.isEmpty()) {
//                    Set<Etablissement> etabs = new HashSet<>();
//                    int nb = random.nextInt(1, Math.min(3, etablissments.size()));
//                    for (int j = 0; j < nb; j++) {
//                        etabs.add(etablissements.get(random.nextInt(etablissments.size())));
//                    }
//                    user.setEtablissements(etabs);
//                }
//
//                userRepository.save(user);
//            }
//
//            // 🔹 Création d’un administrateur
            if(userRepository.count() == 0) {
                User admin = User.builder()
                        .firstname("Michel")
                        .lastname("Bossoh")
                        .email("bossohpaulin@gmail.com")
                        .password(passwordEncoder.encode("admin123"))
                        .agence("AGENCE CENTRALE")
                        .dateOfBirth(LocalDate.of(1990, 1, 1))
                        .imageUrl("https://i.pravatar.cc/150?u=admin")
                        .pdvFne("PDVMH")
                        .etablisssementFne("MODERNE HYGIENE")
                        .accountLocked(false)
                        .enabled(true)
                        .roles(List.of(adminRole))
                        .build();
                userRepository.save(admin);
            }

//
//            System.out.println("👤 10 utilisateurs + 1 administrateur créés avec succès !");
//
//            List<User> users = userRepository.findAll();
//            List<Functionality> functs = functionalityRepository.findAll();
//
//            if (users.isEmpty() || functionalities.isEmpty()) {
//                System.out.println("⚠️ Impossible de générer les attributions : aucun user ou fonctionnalité trouvée !");
//                return;
//            }
//
//            // Vérifie si la table est déjà remplie
//            if (attributionRepository.count() > 0) {
//                System.out.println("ℹ️ Les attributions existent déjà, aucune génération effectuée.");
//                return;
//            }
//
//            System.out.println("🚀 Génération de données d’attribution aléatoires...");
//
//            // Pour chaque utilisateur, assigner quelques fonctionnalités au hasard
//            for (User user : users) {
//                int nbFonctions = random.nextInt(3, 6); // entre 3 et 5 fonctionnalités
//                for (int i = 0; i < nbFonctions; i++) {
//                    Functionality func = functionalities.get(random.nextInt(functs.size()));
//
//                    Attribution attr = Attribution.builder()
//                            .user(user)
//                            .functionality(func)
//                            .lecture(random.nextBoolean())
//                            .writing(random.nextBoolean())
//                            .modification(random.nextBoolean())
//                            .deletion(random.nextBoolean())
//                            .validation(random.nextBoolean())
//                            .createdDate(LocalDateTime.now().minusDays(random.nextInt(0, 30)))
//                            .lastModifiedDate(LocalDateTime.now())
//                            .build();
//
//                    attributionRepository.save(attr);
//                }
//            }
//
//            System.out.println("✅ Données d’attribution générées avec succès !");


    };
    }
}
